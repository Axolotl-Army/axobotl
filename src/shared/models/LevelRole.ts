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
  declare roleId: string;
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
      allowNull: false,
      comment: 'Discord role snowflake ID',
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
