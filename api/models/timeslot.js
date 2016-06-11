/* jshint indent: 4 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('timeslot', { 
		name: {
			type: DataTypes.STRING,
			allowNull: true
		},
		start: {
			type: DataTypes.DATE,
			allowNull: true
		},
		end: {
			type: DataTypes.DATE,
			allowNull: true
		}
	});
};



