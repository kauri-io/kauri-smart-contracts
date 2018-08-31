if [ "${TARGET_ENV}" == "" ]; then
  echo "Environment not set, please run env_setup script in ops folder"
  exit 1
fi

if [ "${TARGET_ENV}" == "dev" ]; then
  network="k8sdev"
elif [ "${TARGET_ENV}" == "dev2" ]; then
  network="rinkeby"
elif [ "${TARGET_ENV}" == "uat" ]; then
  network="rinkeby"
else
  echo "Unknown environment ${TARGET_ENV}"
  exit 1
fi

if [ "${MIGRATION_MODE}" == "reset" ]; then
  migrationParameters="--reset"
else
    echo Upgrading KauriCore
    docker exec -it docker_truffle-build_1 rm -rf build
    docker exec -it docker_truffle-build_1 mkdir build
    docker exec -it docker_truffle-build_1 cp -r /project/contracts/ build/
    migrationParameters="-f 3"
fi

output=$(docker exec -it docker_truffle-build_1 truffle migrate --network ${network} $migrationParameters | tee /dev/tty)
CONTRACT_ADDRESS=$(echo "$output" | grep '^KauriCore address:' | sed 's/KauriCore address: //' | sed $'s@\r@@g')
MODERATOR_CONTRACT_ADDRESS=$(echo "$output" | grep '^TopicModerator address:' | sed 's/TopicModerator address: //' | sed $'s@\r@@g')
WALLET_CONTRACT_ADDRESS=$(echo "$output" | grep '^Wallet address:' | sed 's/Wallet address: //' | sed $'s@\r@@g')
STORAGE_CONTRACT_ADDRESS=$(echo "$output" | grep '^Storage address:' | sed 's/Storage address: //' | sed $'s@\r@@g')
COMMUNITY_CONTRACT_ADDRESS=$(echo "$output" | grep '^Community address:' | sed 's/Community address: //' | sed $'s@\r@@g')
echo KuariCore Contract Address: $CONTRACT_ADDRESS
echo Wallet Contract Address: $WALLET_CONTRACT_ADDRESS
echo Storage Contract Address: $STORAGE_CONTRACT_ADDRESS
echo Community Contract Address: $COMMUNITY_CONTRACT_ADDRESS

if [ "${CONTRACT_ADDRESS}" == "" ] || [ "${COMMUNITY_CONTRACT_ADDRESS}" == "" ] || [ "${WALLET_CONTRACT_ADDRESS}" == "" ] || [ "${STORAGE_CONTRACT_ADDRESS}" == "" ]; then
  echo "Migration failed"
  exit 1
fi

if [ -n "$(kubectl get secret smart-contract-addresses --ignore-not-found)" ]; then
  kubectl delete secret smart-contract-addresses
fi

kubectl create secret generic smart-contract-addresses \
                                                --namespace=${TARGET_ENV} \
                                                --from-literal=KuariCoreContractAddress=$CONTRACT_ADDRESS \
                                                --from-literal=ModeratorContractAddress=$MODERATOR_CONTRACT_ADDRESS \
                                                --from-literal=WalletContractAddress=$WALLET_CONTRACT_ADDRESS \
                                                --from-literal=StorageContractAddress=$STORAGE_CONTRACT_ADDRESS \
                                                --from-literal=CommunityContractAddress=$COMMUNITY_CONTRACT_ADDRESS
