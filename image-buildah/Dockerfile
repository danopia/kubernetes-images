FROM quay.io/buildah/stable

# Add git
RUN dnf -y install git && rm -rf /var/cache /var/log/dnf* /var/log/yum.*

# Buildah doesn't have a default search registry, let's set one
RUN echo 'unqualified-search-registries = ["docker.io"]' \
      > /etc/containers/registries.conf
