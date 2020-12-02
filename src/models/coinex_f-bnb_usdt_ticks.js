const {
  DataTypes
} = require('sequelize');

module.exports = sequelize => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: "nextval(\"coinex_f-bnb_usdt_ticks_id_seq\"::regclass)",
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
    tableName: "coinex_f-bnb_usdt_ticks",
    comment: "",
    indexes: [{
      name: "coinex_f-bnb_usdt_ticks_serverTimestamp_idx",
      unique: false,
      fields: ["serverTimestamp"]
    }]
  };
  const CoinexFBnbUsdtTicksModel = sequelize.define("coinex_f-bnb_usdt_ticks_model", attributes, options);
  return CoinexFBnbUsdtTicksModel;
};