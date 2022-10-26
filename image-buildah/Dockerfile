FROM quay.io/buildah/stable

# Add git
RUN dnf -y install git && rm -rf /var/cache /var/log/dnf* /var/log/yum.*

# Use IPv6 Dockerhub whenever possible to configure
RUN echo 'unqualified-search-registries = ["registry.ipv6.docker.com"]' \
      > /etc/containers/registries.conf

