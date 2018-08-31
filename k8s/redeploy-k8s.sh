if [[ "$1" =~ [0-9]\.[0-9]\.[0-9] ]]; then
  TAG=$1
  echo "Deploying tag: ${TAG}"
else
  echo "Please supply tag"
  exit 1
fi

if [ "${TARGET_ENV}" == "" ]; then
  echo "Environment not set, please run env_setup script in ops folder"
  exit 1
fi


# Create app if not exists
kubectl delete -f k8s/contracts-server-deployment-${TARGET_ENV}.yml || true
sleep 10
sed -e "s/TAG/${TAG}/g" k8s/contracts-server-deployment-${TARGET_ENV}.yml | sed -e "s/REGISTRY/${REGISTRY_URL}\/${GOOGLE_PROJECT_ID}/g" > deployment.yml
kubectl apply -f deployment.yml || true
rm deployment.yml
