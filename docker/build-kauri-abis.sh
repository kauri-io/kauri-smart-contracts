#!/bin/sh

if [[ "$1" =~ [0-9]\.[0-9]\.[0-9] ]]; then
  TAG=$1
  echo "Building with tag: ${TAG}"
else
  echo "Please supply tag"
  exit 1
fi

if [ "${TARGET_ENV}" == "" ] || [ "${REGISTRY_URL}" == "" ]; then
  echo "Environment not set, please run env_setup script in ops folder"
  exit 1
fi

set -e

LATEST_TAG="latest-${TARGET_ENV}"

docker build -t ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:${TAG} -f docker/Dockerfile.contract-abis .
docker build -t ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:${LATEST_TAG} -f docker/Dockerfile.contract-abis .
docker push ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:${TAG}
docker push ${REGISTRY_URL}/${GOOGLE_PROJECT_ID}/kauri-contract-abis:${LATEST_TAG}
