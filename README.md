# CRYPTOPIP

Distributed, highly availabiliity cryptocurrency market data system. Stores tick-level L1 & L2 data for 20+ largest crypto exchanges.

**This is a snapshot of the project and will not be updated**


# Setup

## All Machines

Run ansible on the development machine

    cd cryptopip/infrastructure/ansible
    ansible-playbook -K -i hosts.yml playbook.yml

## Database Machine

    git clone https://gitlab.com/dannychua/cryptopip
    cd cryptopip/infrastructure/db
    docker-compose up -d

*Note: If using Docker for Windows/Mac software, increasing the Memory limit from 2 GB to 12 GB. Otherwise PostgreSQL will be terminated by OOM Killer during heavy bulk insert operations.*

### Database Migration

    npx knex --knexfile ./config/knexfile-datalake.js migrate:latest


### If database & tables do not exist (New)

```js
cd src
npx knex --knexfile config/knexfile-datalake.js migrate:up 
```

### If database & tables do not exist (Old version)

0. Install npm packages
        npm install
        cd src

1. Create database: 

        npx sequelize-cli db:create

2. Create tables & hypertables
        
        npx sequelize-cli db:migrate

    *Note: The table `Ticks` must not have a primary_key, otherwise TimescaleDB cannot create the hypertable.*
    *https://github.com/timescale/timescaledb/issues/447#issuecomment-487003856*

3. Generate Sequelize model files

        npx sequelize-automate -t js -h localhost -d database_development -u postgres -p cryptopippass -P 5432 -e postgres -o models -c "./config/sequelize-automate.config.json"

## Adding new exchanges/markets to Watchlist (Old version)

1. Edit and run `utils/get_markets_json.js`.
2. Update `config/universe.json` with new exchange/markets from Step 1.
3. Generate database tables.
    *For dev systems, try `npx sequelize-cli db:migrate:undo && npx sequelize-cli db:migrate` to drop all tables and recreate them.*
4. Generate sequelize models using `sequelize-automate`. Apply fix to remove `id` attributes if needed.



# Database

## On cryptopip-db machine

    cd ~/cryptopip/infrastructure/db
    docker-compose up -d



# Datalake Downloader

Collects data from remote ingestor database, deduplicates and save to local datalake.

    node --max-old-space-size=4096 datalakeDownloader.js

*Runs on `cryptopip-db`*

## Backups

Extracts current month's data from every database table into individual CSV files compressed into .gz files. The directory containing the entire month's data is then compressed into a single .tar.gz file.
Syncs the entire `backups` folder to Google Drive.

    node cryptopip/databaseBackup.js


# Physical Backup (WAL-E)

## Take a base backup

    docker exec cryptopip-wale wal-e backup-push /var/lib/postgresql/data/pg_data

## List base backups

    docker exec cryptopip-wale wal-e backup-list

## Purge older base backups

    docker exec cryptopip-wale wal-e delete --confirm retain 1



# Logical Backup (Manual)

    pg_dump -h 172.22.0.4 -p 5432 -U postgres -Z0 -Fc datalake_development | pigz --rsyncable > datalake_development.gz

    pg_dump -h 172.22.0.4 -p 5432 -U postgres -Z0 -Fc app_development | pigz --rsyncable > app_development.gz


## Daily Cronjobs

1. Retrieve and dedupe date from remote ingesters 
2. Backup database to .tar.gz and syncs with Google Drive

```
01 00 * * * node --max-old-space-size=4096 cryptopip/datalakeDownloader.js >> cryptopip/logs/datalakeDownloader.log 2>&1

00 01 * * * node cryptopip/databaseBackup.js >> cryptopip/logs/databaseBackup.log 2>&1
```

*Runs on `cryptopip-db`*

## Useful Utilities

### Data Continuity Checker

Checks for missing data

    node utils/check_data_continuity.js


# Notes

## Commands used when setting up from scratch

    npx sequelize-cli init
    npx sequelize-cli model:create --name Tick --attributes exchange:string,quote:string,base:string,tradeId:string,unix:bigint,side:string,price:double,amount:double,buyOrderId:string,sellOrderId:string,serverTimestamp:double
    npx sequelize-cli db:create 
    npx sequelize-cli db:migrate


# Server Provisioning

## 1. Ansible Playbook

*Runs on development system*

```bash
cd cryptopip/infrastructure/ansible
ansible-playbook -K -i hosts.yml playbook.yml
```

## 2. ZFS on Storage Disks

```bash
sudo apt install zfsutils-linux

zpool create tank mirror sda sdb
zpool create tank mirror sdc sdd

zfs create tank/storage
zfs set mountpoint=/storage tank/storage
```

If enabling ZFS compression:

```
zfs set compression=lz4 tank/storage
```

## 3. Docker Containers

```bash
cd cryptopip/infrastructure/db
docker-compose up -d
```

## 4. Restore Database from Backup

### 4.1 Download and extract the `pg_dump` backup file

*Remember to remove the `&export=download` part of the Google drive link*

    curl -JLO https://drive.google.com/uc?id=1GJSa-uQl39BO14dUK4LY194x3OaJIPnS
    gzip -d database_development_2020-02-29.gz
or

    pigz -dc datalake_development_2020-02-29.gz > datalake_development_2020-02-29

### 4.3 Set Temporary PostgreSQL Settings

```
ALTER SYSTEM SET max_wal_size = '16GB';
ALTER SYSTEM SET autovacuum=off;
ALTER SYSTEM SET archive_mode=off;
ALTER SYSTEM SET fsync=off;
ALTER SYSTEM SET full_page_writes=off;
ALTER SYSTEM SET checkpoint_timeout='15min';
ALTER SYSTEM SET checkpoint_completion_target=0.9;
ALTER SYSTEM SET track_counts=off;
ALTER SYSTEM SET synchronous_commit=off;
ALTER SYSTEM SET bgwriter_delay='1000ms';
```

### 4.3 Connect into the TimescaleDB docker container in a `screen`

    screen
    docker exec -it cryptopip-timescaledb /bin/bash

### 4.5 Reload postgresql.auto.conf Settings

    su postgres
    pg_ctl reload

### 4.5 Run SQL commands in `psql`

```bash
psql
```

then run

```sql
CREATE DATABASE datalake_development;
\c datalake_development
CREATE EXTENSION timescaledb;
SELECT timescaledb_pre_restore();

\! time pg_restore -Fc -d datalake_development /backups/datalake_development_2020-04-03

SELECT timescaledb_post_restore();
```

### Revert to Original PostgreSQL Settings

```
ALTER SYSTEM RESET ALL
```

### Notes

1. During a database restore, if migration encounters an error `ERROR: tried calling catalog_get when extension isn't loaded` during table creation step, try running the migration first, then perform the database restore.