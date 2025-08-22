from  registry.cn-hangzhou.aliyuncs.com/masx200/supergateway-github-mcp-server:2025-08-06-03-24-16


run cat  <<EOF > /etc/apt/sources.list 
# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
deb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie main contrib non-free non-free-firmware
deb-src https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie main contrib non-free non-free-firmware

deb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie-updates main contrib non-free non-free-firmware
deb-src https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie-updates main contrib non-free non-free-firmware

deb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie-backports main contrib non-free non-free-firmware
deb-src https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie-backports main contrib non-free non-free-firmware

# 以下安全更新软件源包含了官方源与镜像站配置，如有需要可自行修改注释切换
deb https://mirrors.tuna.tsinghua.edu.cn/debian-security trixie-security main contrib non-free non-free-firmware
deb-src https://mirrors.tuna.tsinghua.edu.cn/debian-security trixie-security main contrib non-free non-free-firmwarey main non-free-firmware
EOF



run  cat  <<EOF > /etc/apt/sources.list.d/debian.sources

Types: deb
URIs: https://mirrors.tuna.tsinghua.edu.cn/debian
Suites: trixie trixie-updates trixie-backports
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

# 默认注释了源码镜像以提高 apt update 速度，如有需要可自行取消注释
Types: deb-src
URIs: https://mirrors.tuna.tsinghua.edu.cn/debian
Suites: trixie trixie-updates trixie-backports
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

# 以下安全更新软件源包含了官方源与镜像站配置，如有需要可自行修改注释切换
Types: deb
URIs: https://mirrors.tuna.tsinghua.edu.cn/debian-security
Suites: trixie-security
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

Types: deb-src
URIs: https://mirrors.tuna.tsinghua.edu.cn/debian-security
Suites: trixie-security
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

EOF



run apt update -y && apt clean  


run apt install apt-transport-https ca-certificates -y && apt clean 

run apt install python3 python3-pip   -y && apt clean 


run npm config set registry https://registry.npmmirror.com


env HOME=/root
run mkdir -pv /root/.config/uv/ 

run cat  <<EOF > /root/.config/uv/config.toml
[[index]]
url = "https://pypi.tuna.tsinghua.edu.cn/simple"
default = true
EOF

run  pip config set install.trusted-host 'https://pypi.tuna.tsinghua.edu.cn'
run pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
run pip install uv --break-system-packages


WORKDIR /root/mcp-streamable-http-bridge



copy . .

run rm -frv '/usr/local/bin/pnpm'
run rm -frv '/usr/local/bin/pnpx'
run rm -frv '/usr/local/bin/yarn'
run rm -frv  '/usr/local/bin/yarnpkg'

run corepack enable

run corepack up 

run yarn install

run yarn run build

ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node","/root/mcp-streamable-http-bridge/bridge-streamable-ts.js" ]



run  uv  venv 
run pip install "mcp-server-time" --break-system-packages
env UV_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
run uv pip install "mcp-server-time" 

run npm install -g cnpm --registry=https://registry.npmmirror.com

run npm i -g @mcpcn/mcp-daily-hot-list
run cnpm i -g "@mcpcn/mcp-daily-hot-list"