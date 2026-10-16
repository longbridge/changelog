# Releases are deployed by merging, not by commands:
#
#   PR opened to main     → GitHub Actions deploys a Cloudflare Pages preview (.github/workflows/preview.yml)
#   PR merged into main   → GitHub Actions deploys production (longbridge.com/<locale>/changelog)
#
# See .github/workflows/deploy.yml. Only local targets live here:
#
#   make check                               # run the CI checks locally before merging a PR
#   make build                               # build the site into dist/
#   make deploy:website-local                # upload to OSS from this machine, for emergencies or debugging; export OSS_* first (see scripts/deploy.ts)
#
# The colon in the target name is escaped for make; on the command line just type make deploy:website-local.

.PHONY: deploy\:website-local build check clean

deploy\:website-local: check build
	bun run deploy

build:
	bun run build

check:
	bun run check
	bun run check:assets

clean:
	rm -rf dist
