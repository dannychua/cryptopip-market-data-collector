const {
  DataTypes
} = require('sequelize');

module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: true
    },
    sequenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sequenceId",
      autoIncrement: false
    },
    lastSequenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "lastSequenceId",
      autoIncrement: false
    },
    asks: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "asks",
      autoIncrement: false
    },
    bids: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "bids",
      autoIncrement: false
    },
    isSnapshot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "isSnapshot",
      autoIncrement: false
    },
    serverTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      field: "serverTimestamp",
      autoIncrement: false
    },
    exchangeTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "exchangeTimestamp",
      autoIncrement: false
    }
  };
  const options = {
    tableName: "binanceus_zec_usd_orderbook",
    comment: "",
    indexes: [{
      name: "binanceus_zec_usd_orderbook_serverTimestamp_idx",
      unique: false,
      fields: ["serverTimestamp"]
    }]
  };
  const BinanceusZecUsdOrderbookModel = sequelize.define("binanceus_zec_usd_orderbook_model", attributes, options);
  return BinanceusZecUsdOrderbookModel;
};