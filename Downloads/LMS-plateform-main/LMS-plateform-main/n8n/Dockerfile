# =============================================================================
# n8n Custom Image — LMS Platform
#
# Extends the official n8n image to automatically import and activate
# all LMS workflows on first startup.
#
# The init.sh entrypoint script:
#   1. Waits for PostgreSQL to accept connections.
#   2. Imports every JSON file from /workflows into n8n's database.
#   3. Starts the n8n process.
# =============================================================================

FROM n8nio/n8n:latest

USER root

# Copy the startup script
COPY --chmod=755 init.sh /init.sh

USER node

ENTRYPOINT ["tini", "--", "/init.sh"]
