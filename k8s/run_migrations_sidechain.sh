if [ "${TARGET_ENV}" == "" ]; then
  echo "Environment not set, please run env_setup script in ops folder"
  exit 1
fi

if [ "${TARGET_ENV}" == "dev" ]; then
  network="sokol"
elif [ "${TARGET_ENV}" == "dev2" ]; then
  network="sokol"
elif [ "${TARGET_ENV}" == "uat" ]; then
  network="poa"
else
  echo "Unknown environment ${TARGET_ENV}"
  exit 1
fi

cd sidechain

if [ "${SKIP_SIDECHAIN}" == "true" ]; then
  echo "Skipping sidechain deployment."
  docker run -d --name kauri-contract-abis ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:latest-${TARGET_ENV}
  mkdir build
  docker cp kauri-contract-abis:/project/sidechain/contracts build/
  docker stop kauri-contract-abis
  docker rm kauri-contract-abis
  exit 0
fi

npm install

if [ "${MIGRATION_MODE}" == "reset" ]; then
  migrationParameters="--reset"
else
    echo Upgrading KauriCore
    docker run -d --name kauri-contract-abis ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:latest-${TARGET_ENV}
    mkdir build
    docker cp kauri-contract-abis:/project/sidechain/contracts build/
    docker stop kauri-contract-abis
    docker rm kauri-contract-abis
    if [ -f build/contracts/GroupConnector.json ]; then
      migrationParameters="-f 3"
    else
      echo Unable to upgrade as Group.json not found, deploying all
    fi
fi

output=$(truffle migrate --network ${network} $migrationParameters | tee /dev/tty)
GROUP_ADDRESS=$(echo "$output" | grep '^Group address:' | sed 's/Group address: //' | sed $'s@\r@@g')
echo Group Contract Address: $GROUP_ADDRESS


if [ "${GROUP_ADDRESS}" == "" ] ; then
  echo "Migration failed"
  exit 1
fi

if [ -n "$(kubectl get secret smart-contract-sidechain-addresses --ignore-not-found)" ]; then
  kubectl delete secret smart-contract-sidechain-addresses
fi

kubectl create secret generic smart-contract-sidechain-addresses \
                                                --namespace=${TARGET_ENV} \
                                                --from-literal=GroupContractAddress=$GROUP_ADDRESS

cd ..
