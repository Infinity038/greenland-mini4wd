#!/usr/bin/env bash
# Archive + encrypt a verified backup folder. Prefer age with a recipient PUBLIC key (private key kept offline).
. "$(dirname "$0")/lib.sh"
D="${1:?usage: 30_encrypt.sh <backup-dir>}"; D="${D%/}"; base=$(basename "$D"); par=$(dirname "$D")
if [ -n "${AGE_RECIPIENT:-}" ]; then need age; need tar
  tar -C "$par" -cf - "$base" | age -r "$AGE_RECIPIENT" -o "$par/$base.tar.age"; ENC="$par/$base.tar.age"
else need gpg; need tar
  tar -C "$par" -cf - "$base" | gpg --symmetric --cipher-algo AES256 --output "$par/$base.tar.gpg"; ENC="$par/$base.tar.gpg"
fi
( cd "$par" && sha256sum "$(basename "$ENC")" > "$(basename "$ENC").sha256" )
echo "Encrypted: $ENC ($(du -h "$ENC" | cut -f1))"; cat "$ENC.sha256"
echo "NEXT: prove you can decrypt (age -d -i <identity> FILE | tar -t  or  gpg -d FILE | tar -t), copy ENC + .sha256 to an off-device location, then delete the plaintext folder."
