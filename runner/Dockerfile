FROM gcc:14-bookworm
RUN useradd -m -u 10001 runner
WORKDIR /work
COPY run.sh /usr/local/bin/run.sh
RUN chmod +x /usr/local/bin/run.sh
USER runner
ENTRYPOINT ["/usr/local/bin/run.sh"]
