#!/bin/sh
set -u
gcc -std=c11 -O2 -Wall -Wextra -o main main.c 2>compile.err
status=$?
if [ $status -ne 0 ]; then
  cat compile.err >&2
  exit $status
fi
if [ -s compile.err ]; then cat compile.err >&2; fi
timeout 3 ./main
