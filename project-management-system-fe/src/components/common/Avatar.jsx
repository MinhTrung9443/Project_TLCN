import React from 'react';

const Avatar = ({ user, sizeClassName = 'w-8 h-8', textClassName = 'text-sm' }) => {
    const getInitials = (name, fallback = 'U') => {
        if (!name) return fallback;
        return name.charAt(0).toUpperCase();
    };

    return (
        <>
            {user?.avatar ? (
                <img src={user.avatar} alt={user.fullname || user.username} className={`${sizeClassName} rounded-full object-cover`} />
            ) : (
                <div className={`${sizeClassName} rounded-full bg-gradient-to-br from-indigo-600 to-primary-700 text-white flex items-center justify-center font-semibold ${textClassName}`}>
                    {getInitials(user?.fullname || user?.username)}
                </div>
            )}
        </>
    );
};

export default Avatar;
