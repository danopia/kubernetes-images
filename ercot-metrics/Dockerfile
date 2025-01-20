FROM denoland/deno:alpine-1.35.0
ENV DENO_NO_UPDATE_CHECK=1
WORKDIR /src/app

ADD deps.ts ./
RUN ["deno", "check", "deps.ts"]

ADD *.ts ./
RUN ["deno", "check", "mod.ts"]

ENTRYPOINT ["deno", "run", "--unstable", "--allow-net", "--allow-hrtime", "--allow-env", "--allow-sys", "--cached-only", "mod.ts"]
