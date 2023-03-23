FROM alpine:3.17
RUN apk add journalctl ca-certificates cmd:useradd
RUN wget -O otelcol-contrib.apk https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.74.0/otelcol-contrib_0.74.0_linux_amd64.apk \
 && apk add --allow-untrusted otelcol-contrib.apk \
 && rm otelcol-contrib.apk
ENTRYPOINT ["/usr/bin/otelcol-contrib"]
