#!/bin/bash
# ==========================================
# Postfix + OpenDKIM Setup for dalletek.live
# ==========================================
# Run this on first server setup or when reconfiguring mail
# Path: /var/www/iptv-boss/scripts/postfix-setup.sh

set -e

echo "=== Postfix + DKIM Setup ==="

# 1. Install packages
apt-get update -qq
apt-get install -y -qq postfix opendkim opendkim-tools mailutils

# 2. Generate DKIM keys if not present
if [ ! -f /etc/opendkim/keys/dalletek.live/mail.private ]; then
  mkdir -p /etc/opendkim/keys/dalletek.live
  cd /etc/opendkim/keys/dalletek.live
  opendkim-genkey -s mail -d dalletek.live
  chown opendkim:opendkim mail.private
  echo "DKIM keys generated. Add this TXT record to DNS:"
  cat mail.txt
fi

# 3. Copy configs
cp /var/www/iptv-boss/postfix/main.cf /etc/postfix/main.cf
cp /var/www/iptv-boss/postfix/opendkim.conf /etc/opendkim.conf

# 4. Set up SASL password from DB
SMTP_USER=$(sqlite3 /var/www/iptv-boss/server/data.db "SELECT value FROM app_settings WHERE key='smtp_user'")
SMTP_PASS=$(sqlite3 /var/www/iptv-boss/server/data.db "SELECT value FROM app_settings WHERE key='smtp_pass'")
echo "[smtp.gmail.com]:587 $SMTP_USER:$SMTP_PASS" > /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd

# 5. Restart services
systemctl restart opendkim
systemctl restart postfix

echo "=== Done ==="
echo "To remove Gmail relay when ports 25/465 unblocked:"
echo "  postconf -e 'relayhost =' && systemctl restart postfix"
