import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../database';

export class LevelRole extends Model<
  InferAttributes<LevelRole>,
  InferCreationAttributes<LevelRole>
> {
  declare guildId: string;
  declare level: number;
  declare roleId: CreationOptional<string | null>;
  declare cumulative: CreationOptional<boolean>;
  declare description: CreationOptional<string | null>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

LevelRole.init(
  {
    guildId: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      references: { model: 'guilds', key: 'id' },
      comment: 'Discord guild snowflake ID',
    },
    level: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      comment: 'Level at which the role is awarded',
    },
    roleId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Discord role snowflake ID (null for role-less milestone rewards)',
    },
    cumulative: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'If true, role persists through all level-ups',
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      defaultValue: null,
      comment: 'Free-text description of what this reward grants (used in reward messages)',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'level_roles',
    timestamps: true,
  },
);

export default LevelRole;
