FROM denoland/deno:alpine-1.29.1
WORKDIR /src/app

ADD _lib.ts ./
RUN ["deno", "check", "_lib.ts"]

ADD *.ts ./
RUN ["deno", "check", "signal.ts"]

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-env", "--allow-run=curl", "--cached-only", "signal.ts"]
