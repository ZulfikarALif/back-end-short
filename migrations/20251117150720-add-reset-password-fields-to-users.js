/*
'use strict';

// Gunakan export default sebagai pengganti module.exports
export default {
    up: async (queryInterface, Sequelize) => {
        // 🔹 Tambahkan kolom resetPasswordToken
        await queryInterface.addColumn('users', 'resetPasswordToken', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // 🔹 Tambahkan kolom resetPasswordExpires
        await queryInterface.addColumn('users', 'resetPasswordExpires', {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    down: async (queryInterface, Sequelize) => {
        // 🔹 Hapus kolom (jika migration di-rollback)
        await queryInterface.removeColumn('users', 'resetPasswordToken');
        await queryInterface.removeColumn('users', 'resetPasswordExpires');
    }
};*/