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
  declare levelUpMessage: CreationOptional<string | null>;
  declare levelUpChannelId: CreationOptional<string | null>;
  declare disabledCommands: CreationOptional<string[]>;
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
    levelUpMessage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
      comment: 'Custom level-up message template; null = use default',
    },
    levelUpChannelId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Channel for level-up notifications; null = same channel as message',
    },
    disabledCommands: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of base command names disabled for this guild',
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
