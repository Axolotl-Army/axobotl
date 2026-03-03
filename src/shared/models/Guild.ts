import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../database';

export class Guild extends Model<
  InferAttributes<Guild>,
  InferCreationAttributes<Guild>
> {
  declare id: string;
  declare name: string;
  declare prefix: CreationOptional<string>;
  declare logsChannelId: CreationOptional<string | null>;
  declare language: CreationOptional<string>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Guild.init(
  {
    id: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      comment: 'Discord guild snowflake ID',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    prefix: {
      type: DataTypes.STRING(10),
      defaultValue: '!',
      allowNull: false,
    },
    logsChannelId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Discord channel ID for bot logs',
    },
    language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en',
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'guilds',
    timestamps: true,
  },
);

export default Guild;
