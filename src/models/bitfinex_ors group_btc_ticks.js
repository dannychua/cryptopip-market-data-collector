const {
  DataTypes
} = require('sequelize');

module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: "nextval(\"bitfinex_ors group_btc_ticks_id_seq\"::regclass)",
      comment: null,
      primaryKey: true,
      field: "id",
      autoIncrement: false
    },
    tradeId: {
      type: DataTypes.CHAR(255),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "tradeId",
      autoIncrement: false
    },
    side: {
      type: DataTypes.CHAR(255),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "side",
      autoIncrement: false
    },
    price: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "price",
      autoIncrement: false
    },
    amount: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "amount",
      autoIncrement: false
    },
    buyOrderId: {
      type: DataTypes.CHAR(255),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "buyOrderId",
      autoIncrement: false
    },
    sellOrderId: {
      type: DataTypes.CHAR(255),
      allowNull: true,
      defaultValue: null,
      comment: null,
      primaryKey: false,
      field: "sellOrderId",
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
    tableName: "bitfinex_ors group_btc_ticks",
    comment: "",
    indexes: [{
      name: "bitfinex_ors group_btc_ticks_serverTimestamp_idx",
      unique: false,
      fields: ["serverTimestamp"]
    }]
  };
  const BitfinexOrsGroupBtcTicksModel = sequelize.define("bitfinex_ors group_btc_ticks_model", attributes, options);
  return BitfinexOrsGroupBtcTicksModel;
};