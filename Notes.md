SELECT pg_size_pretty( pg_database_size('database_development') ) as db, 
(SELECT total_size FROM hypertable_relation_size_pretty('binance_btc_usdt_ticks')) as binance_btc_usdt_ticks,
(SELECT total_size FROM hypertable_relation_size_pretty('binance_btc_usdt_orderbook')) as binance_btc_usdt_orderbook,
(SELECT COUNT(*) FROM binance_btc_usdt_ticks) as num_ticks,
(SELECT COUNT(*) FROM binance_btc_usdt_orderbook) as num_orderbook;


----------

1/1 9:36AM      DB:                                 10 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0

Start ingest.js on all Binance USDT markets

1/1 12:40PM     DB:                                 190 MB
                binance_btc_usdt_ticks:             5552 KB
                binance_btc_usdt_orderbook:         7848 KB
                COUNT(binance_btc_usdt_ticks):      30168
                COUNT(binance_btc_usdt_orderbook):  11053

1/1 2:38pm      DB:                                 260 MB
                binance_btc_usdt_ticks:             7720 KB
                binance_btc_usdt_orderbook:         12 MB
                COUNT(binance_btc_usdt_ticks):      43573
                COUNT(binance_btc_usdt_orderbook):  18099




Emptied all tables. 

1/1 3:48PM      DB:                                 79 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0

1/1 3:59PM      DB:                                 101 MB
                binance_btc_usdt_ticks:             352 KB
                binance_btc_usdt_orderbook:         568 KB
                COUNT(binance_btc_usdt_ticks):      790
                COUNT(binance_btc_usdt_orderbook):  658



Emptied all tables. 

1/1 11:01PM     DB:                                 74 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  0

1/2 9:08AM      DB:                                 521 MB
                binance_btc_usdt_ticks:             16 MB
                binance_btc_usdt_orderbook:         26 MB
                COUNT(binance_btc_usdt_ticks):      101185
                COUNT(binance_btc_usdt_orderbook):  36541

1/2 10:35PM      DB:                                1166 MB
                binance_btc_usdt_ticks:             48 MB
                binance_btc_usdt_orderbook:         67 MB
                COUNT(binance_btc_usdt_ticks):      299546
                COUNT(binance_btc_usdt_orderbook):  84871


3 exchanges:
    cpu:    15%
    ram:    519 MB
    iops:   ? tps
    write:  ? MB/s
    dl:     ? Kbps



Emptied all tables. Add to total 5 exchanges. USDT markets only

5 exchanges (USDT markets):
    cpu:    20-30%
    ram:    519 MB
    iops:   50 tps
    write:  0.3-0.5 MB/s
    dl:     800 Kbps

1/4 5:13PM      DB:                                 146 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  0

1/4 5:13PM      DB:                                 214 MB
                binance_btc_usdt_ticks:             1632 KB
                binance_btc_usdt_orderbook:         2328 KB
                COUNT(binance_btc_usdt_ticks):      6861
                COUNT(binance_btc_usdt_orderbook):  3515

1/4 10:30PM     DB:                                 511 MB
                binance_btc_usdt_ticks:             16 MB
                binance_btc_usdt_orderbook:         17 MB
                COUNT(binance_btc_usdt_ticks):      85216
                COUNT(binance_btc_usdt_orderbook):  18983




Emptied all tables. Add to total 7 exchanges. 
`node --max-old-space-size=2048 ingest.js`

7 exchanges:
    cpu:    100%
    ram:    868 MB
    iops:   1200-2000 tps
    write:  4-22 MB/s
    dl:     1.4 Mbps

1/5 11:48PM     DB:                                 254 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  0





Emptied all tables. 7 exchanges. Seperate DB and Ingester servers 
Orderbook only    

1/8 3:25PM      DB:                                 342 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  0 

1/8 3:37PM      DB:                                 575 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         728 KB
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  456

1/8 4:29PM      DB:                                 1147 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         3200 KB
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  2334

Started Trades in addition to L2

1/9 3:29PM      DB:                                 10 GB
                binance_btc_usdt_ticks:             74 MB
                binance_btc_usdt_orderbook:         53 MB
                COUNT(binance_btc_usdt_ticks):      425997
                COUNT(binance_btc_usdt_orderbook):  50124



Emptied all tables. 7 exchanges. Seperate DB and Ingester servers 

1/11 9:00pm     DB:                                 238 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  0

1/12 4:14pm     DB:                                 6436 MB




Emptied all tables. 7 exchanges. Seperate 1 DB and 2 Ingester servers 

1/14 1:25am     DB:                                 238 MB
                binance_btc_usdt_ticks:             -
                binance_btc_usdt_orderbook:         -
                COUNT(binance_btc_usdt_ticks):      0
                COUNT(binance_btc_usdt_orderbook):  0

1/14 11:07pm    DB:                                 12 GB
                binance_btc_usdt_ticks:             137 MB
                binance_btc_usdt_orderbook:         50 MB
                COUNT(binance_btc_usdt_ticks):      793147
                COUNT(binance_btc_usdt_orderbook):  45421






---------------
Docker PostgreSQL RAM Limit:                    6 GB
Nodejs datalakeDownloader max-old-space-size:   4 GB
    - Bulk insert chunks                200K
    - INGESTER_RETRIVAL_CONCURRENCY     10
RESULT: PostgreSQL CRASHes

---------------
Docker PostgreSQL RAM Limit:                    10 GB
Nodejs datalakeDownloader max-old-space-size:   4 GB
    - Bulk insert chunks                200K
    - INGESTER_RETRIVAL_CONCURRENCY     5

RESULT: OK!
node --max-old-space-size=4096 datalakeDownloader.js  2762.73s user 1038.52s system 46% cpu 2:15:58.45 total







----------------
Jan 28
----------------

datalakeDownloader.js       (TRADES ONLY, NO ORDERBOOKS)
    Retrieving data before 2020-01-28

    ingester-1: 4826 tables
    ingester-2: 4826 tables
    Unique trade tables: 2413
    Unique orderbook tables: 2413

    ingester-1 | Earliest data: Thu Jan 23 2020 13:57:46 GMT-0500 (Eastern Standard Time)
    ingester-1 | Total Database Size: 43 GB
    ingester-2 | Earliest data: Wed Jan 15 2020 11:02:45 GMT-0500 (Eastern Standard Time)
    ingester-2 | Total Database Size: 82 GB
    Earliest timestamp: Wed Jan 15 2020 11:02:45 GMT-0500 (Eastern Standard Time)


    real    331m46.775s
    user    250m21.947s
    sys     11m36.032s



databaseBackup.js

    real	21m44.486s
    user	12m46.864s
    sys	3m22.765s

Size of cryptopip/backups/2020-01:      1.2 GB




----------------
Jan 31
----------------

datalakeDownloader.js       (ORDERBOOKS ONLY)

    OOM killed after running for 21 hours.
    Possible memory leak due to a creation of a new Sequelize instance on every table download




----------------
Feb 9
----------------

20200208020205-add-column-exchangeTimestamp.js

    Time taken to 
        - add 1 column to 4826 tables  
        - populate it using to_timestamp()
        
        => 55983.879s (~15.5 hr)





----------------
Feb 10
----------------

Plan for db migration

[ PART  1]

1. cryptopip-db:
    - git pull
    - npx sequelize-cli db:migrate
    - node datalakeDownloader.js
    <X> Done @ Feb 8-9

1. (part 2) 
    cryptopip-db
    - git pull
    - npx sequelize-cli db:migrate ( to remove the col unix and timestampMs)

2. cryptopip-ingester-1
    - pm2 stop
    - git pull
    - edit migration file to skip updating 'exchangeTimestamp' col with value from 'unix'
    - npx sequelize-cli db:migrate      (only adds 'exchangeTimestamp' col to all tables)
    - pm2 start

3. cryptopip-ingester-2
    - same

4. datalakeDownloader.js
    - Search for "TEMP" in datalakeDownloader.js
    - Remove these code blocks (2 total)
    - git push

5. cryptopip-db:
    - git pull
    - npx sequelize-cli db:migrate
    - node datalakeDownloader.js


[PART 2]

1. new sequelize migration
    - remove unix column from Trades table
    - remove timestampMs from Orderbook table

2. renegerate sequelize models
    - npx sequelize-automate ...

3. ingest.js
    - delete trade.unix after using for exchangeTimestamp
    - delete snapshot.timestampMs after using for exchangeTimestamp

git push!
    

4. cryptopip-ingester-1, crypotpip-ingester-2
    - git pull
    - npx sequelize-cli db:migrate
    - pm2 restart

5. cryptopip-db
    - git pull
    - npx sequelize-cli db:migrate
    - node datalakeDownloader




[ Current state ]

crpyotpip-db (MBP)
    - models:               has cols 'exchangeTimestamp' NOT 'unix'/'timestampMs'

    - db:                   has cols 'exchangeTimestamp' NOT 'unix'/'timestampMs'

    - datalakeDownloader:   if 'unix'/'timesetampMs' col is DL'ed, convert and use for 'exchangeTimestamp'

    - ingest:               convert 'unix'/'timestampMs' to 'exchangeTimestamp', then delete those fields



cryptopip-db    
    - models:               has cols 'exchangeTimestamp' and 'unix'/'timestampMs'
                            TODO: remove 'unix'/'timestampMs' cols

    - db:                   has cols 'exchangeTimestamp' and 'unix'/'timestampMs'
                            TODO: remove 'unix'/'timestampMs' cols

    - datalakeDownloader:   if 'unix'/'timesetampMs' col is DL'ed, convert and use for 'exchangeTimestamp'




cryptopip-ingester-1
    - models:               has cols 'exchangeTimestamp' NOT 'unix'/'timestampMs'

    - db:                   has cols 'exchangeTimestamp' and 'unix'/'timestampMs'

    - ingest:               convert 'unix'/'timestampMs' to 'exchangeTimestamp', then delete those fields

    <X> pm2 restarted @ Feb 10, 7:45pm


cryptopip-ingester-2
    - db:                   has cols 'unix'/'timestmapMs', NOT 'exchangeTimstamp'

    - ingest:               does NOT convert 'unix'/'timestampMs' to 'exchangeTimestamp'
                            TODO: delete fields after converting to exchangeTimestamp