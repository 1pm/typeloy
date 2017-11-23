#!/bin/bash
# set -e
APP_NAME="<%= appName %>"
DEPLOY_PREFIX="<%= deployPrefix %>"
APP_ROOT=$DEPLOY_PREFIX/$APP_NAME
#-------------------
EMAIL="<%= email %>"
DOMAIN="<%= domain %>"

. $DEPLOY_PREFIX/lib/functions.sh

sudo mkdir -p $DEPLOY_PREFIX/certbot
cd $DEPLOY_PREFIX/certbot
sudo curl -O https://dl.eff.org/certbot-auto
sudo chmod a+x certbot-auto

# Require gpg2 to verify it.
# wget -N https://dl.eff.org/certbot-auto.asc
# gpg2 --recv-key A2CFB51FA275A7286234E7B24D17C995CD9775F2
# gpg2 --trusted-key 4D17C995CD9775F2 --verify certbot-auto.asc certbot-auto


if [[ -n $(ps aux | grep -v grep | grep stud) ]] ; then
    service_stop stud
fi
service_stop $APP_NAME

unset PYTHON_INSTALL_LAYOUT
./certbot-auto certonly --standalone \
    --debug --verbose \
    --non-interactive --text \
    --agree-tos \
    --keep-until-expiring \
    --email $EMAIL -d $DOMAIN
