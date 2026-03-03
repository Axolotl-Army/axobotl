import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../database';
import { Guild } from './Guild';

export class CommandLog extends Model<
  InferAttributes<CommandLog>,
  InferCreationAttributes<CommandLog>
> {
  declare id: CreationOptional<number>;
  declare guildId: string;
  declare userId: string;
  declare username: string;
  declare command: string;
  declare successful: CreationOptional<boolean>;
  declare readonly createdAt: CreationOptional<Date>;
}

CommandLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    guildId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: { model: 'guilds', key: 'id' },
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Discord user snowflake ID',
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    command: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    successful: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'command_logs',
    timestamps: true,
    updatedAt: false,
  },
);

// Associations
Guild.hasMany(CommandLog, { foreignKey: 'guildId', as: 'commandLogs' });
CommandLog.belongsTo(Guild, { foreignKey: 'guildId', as: 'guild' });

export default CommandLog;
