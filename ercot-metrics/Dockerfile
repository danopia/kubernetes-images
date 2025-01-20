FROM denoland/deno:alpine-1.31.2
ENV DENO_NO_UPDATE_CHECK=1
WORKDIR /src/app

ADD deps.ts ./
RUN ["deno", "check", "deps.ts"]

ADD *.ts ./
RUN ["deno", "check", "mod.ts"]

ENTRYPOINT ["deno", "run", "--unstable", "--allow-net", "--allow-hrtime", "--allow-env", "--cached-only", "mod.ts"]
