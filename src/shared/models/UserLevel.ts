import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../database';

export class UserLevel extends Model<
  InferAttributes<UserLevel>,
  InferCreationAttributes<UserLevel>
> {
  declare guildId: string;
  declare userId: string;
  declare xp: CreationOptional<number>;
  declare level: CreationOptional<number>;
  declare lastXpAt: CreationOptional<Date | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

UserLevel.init(
  {
    guildId: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      comment: 'Discord guild snowflake ID',
    },
    userId: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      comment: 'Discord user snowflake ID',
    },
    xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cached level derived from xp — always recalculated on write',
    },
    lastXpAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp of the last XP award for cooldown tracking',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_levels',
    timestamps: true,
    indexes: [
      {
        fields: ['guildId', 'xp'],
        name: 'user_levels_guild_xp',
      },
    ],
  },
);

export default UserLevel;
