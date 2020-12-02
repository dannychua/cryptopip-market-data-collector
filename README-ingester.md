# Collect Data

Collects data from exchanges' WebSocket API and store to local database.

## Using pm2

    pm2 start pm2-ingest.json

## Regular

    node --max-old-space-size=888 ingest.js -e binance


# Initial Setup

## 1. Initial Provisioning

Run ansible on the development machine

    cd cryptopip/infrastructure/ansible
    ansible-playbook -K -i hosts.yml playbook.yml

## 2. Clone Code

    git clone https://gitlab.com/dannychua/cryptopip
    cd cryptopip && npm install
    npm install -g pm2

## 3. Dockerized Infrastructure

    cd cryptopip/infrastructure/ingester
    docker-compose up -d

## 4. Databases & Tables

1. Create the databases `ingester_development`, `ingester_staging`, `ingester_production`
2. Temporarily edit `knexfile-ingester.js` to use port 5432 to access PostgreSQL directly
3. Run

        cd cryptopip/src
        npx knex --knexfile ./config/knexfile-ingester.js migrate:latest
4. Restore original `knexfile-ingester.js` to use pgBouncer port 6432

## 5. PM2

    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 100M
    pm2 set pm2-logrotate:rotateInterval '0 0 * * *'