# 发布不靠命令，靠合并：
#
#   PR 合进 canary → GitHub Actions 部署测试环境（longbridge.xyz/<locale>/changelog）
#   PR 合进 main   → GitHub Actions 部署生产    （longbridge.com/<locale>/changelog）
#
# 见 .github/workflows/deploy.yml。这里只留本地用的几条：
#
#   make check                               # 合 PR 前本地先过一遍 CI 的检查
#   make build                               # 只构建站点，产物在 dist/
#   make deploy:website-local                # 本地直传 OSS，应急或调试用，需要先 export OSS_* 变量（见 scripts/deploy.ts）
#
# 目标名里的冒号在 make 里要转义，命令行上照常写 make deploy:website-local。

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
