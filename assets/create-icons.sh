#!/bin/bash
# 创建简单的纯色图标文件，用户后续可以替换成自己的设计
# 需要安装ImageMagick

mkdir -p src/assets

# 创建16x16图标
convert -size 16x16 xc:skyblue -fill white -gravity center -font Arial -pointsize 10 -annotate 0 "V3" src/assets/icon16.png

# 创建48x48图标
convert -size 48x48 xc:skyblue -fill white -gravity center -font Arial -pointsize 30 -annotate 0 "V3" src/assets/icon48.png

# 创建128x128图标
convert -size 128x128 xc:skyblue -fill white -gravity center -font Arial -pointsize 80 -annotate 0 "V3" src/assets/icon128.png

echo "图标已创建"
