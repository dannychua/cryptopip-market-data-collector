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
    }
  };
  const options = {
    tableName: "cex_ada_usdt_orderbook",
    comment: "",
    indexes: [{
      name: "cex_ada_usdt_orderbook_serverTimestamp_idx",
      unique: false,
      fields: ["serverTimestamp"]
    }]
  };
  const CexAdaUsdtOrderbookModel = sequelize.define("cex_ada_usdt_orderbook_model", attributes, options);
  return CexAdaUsdtOrderbookModel;
};