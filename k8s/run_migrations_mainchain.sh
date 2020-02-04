if [ "${TARGET_ENV}" == "" ]; then
  echo "Environment not set, please run env_setup script in ops folder"
  exit 1
fi

if [ "${TARGET_ENV}" == "dev" ]; then
  network="rinkeby"
elif [ "${TARGET_ENV}" == "dev2" ]; then
  network="rinkeby"
elif [ "${TARGET_ENV}" == "uat" ]; then
  network="mainnet"
else
  echo "Unknown environment ${TARGET_ENV}"
  exit 1
fi

cd mainchain
npm install

if [ "${MIGRATION_MODE}" == "reset" ]; then
  migrationParameters="--reset"
else
    echo Upgrading KauriCheckpoint
    docker run -d --name kauri-contract-abis ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:latest-${TARGET_ENV}
    mkdir build
    docker cp kauri-contract-abis:/project/contracts build/
    docker stop kauri-contract-abis
    docker rm kauri-contract-abis
    migrationParameters="-f 3"
fi

output=$(truffle migrate --network ${network} $migrationParameters | tee /dev/tty)
CHECKPOINT_CONTRACT_ADDRESS=$(echo "$output" | grep '^KauriCheckpoint address:' | sed 's/KauriCheckpoint address: //' | sed $'s@\r@@g')
STORAGE_CONTRACT_ADDRESS=$(echo "$output" | grep '^Storage address:' | sed 's/Storage address: //' | sed $'s@\r@@g')
echo KauriCheckpoint Contract Address: $CHECKPOINT_CONTRACT_ADDRESS
echo Storage Contract Address: $STORAGE_CONTRACT_ADDRESS

if [ "${CHECKPOINT_CONTRACT_ADDRESS}" == "" ] || [ "${STORAGE_CONTRACT_ADDRESS}" == "" ]; then
  echo "Migration failed"
  exit 1
fi

if [ -n "$(kubectl get secret smart-contract-addresses --ignore-not-found)" ]; then
  kubectl delete secret smart-contract-addresses
fi

kubectl create secret generic smart-contract-addresses \
                                                --namespace=${TARGET_ENV} \
                                                --from-literal=KauriCheckpointContractAddress=$CHECKPOINT_CONTRACT_ADDRESS \
                                                --from-literal=StorageContractAddress=$STORAGE_CONTRACT_ADDRESS

cd ..
