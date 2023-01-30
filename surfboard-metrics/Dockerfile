FROM denoland/deno:alpine-1.30.0
WORKDIR /src/app

ADD dep.ts ./
RUN ["deno", "cache", "dep.ts"]

ADD *.ts ./
RUN ["deno", "check", "mod.ts"]

ENTRYPOINT ["deno", "run", "--allow-read", "--allow-net", "--allow-env", "--cached-only", "mod.ts"]
