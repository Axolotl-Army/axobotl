import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../database';

export class GuildPlugin extends Model<
  InferAttributes<GuildPlugin>,
  InferCreationAttributes<GuildPlugin>
> {
  declare guildId: string;
  declare pluginId: string;
  declare enabled: CreationOptional<boolean>;
  declare config: CreationOptional<Record<string, unknown>>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

GuildPlugin.init(
  {
    guildId: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      references: { model: 'guilds', key: 'id' },
      comment: 'Discord guild snowflake ID',
    },
    pluginId: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      comment: 'Plugin identifier (e.g. leveling)',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'guild_plugins',
    timestamps: true,
  },
);

export default GuildPlugin;
