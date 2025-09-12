import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser && storedUser !== 'undefined') {
                return JSON.parse(storedUser);
            }
            return null;
        } catch (error) {
            console.error("Lỗi khi đọc user từ localStorage:", error);
            localStorage.removeItem('user');
            return null;
        }
    });

    const [token, setToken] = useState(() => {
        const storedToken = localStorage.getItem('token');
        return storedToken && storedToken !== 'undefined' ? storedToken : null;
    });

    const login = useCallback((userData, userToken) => {
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(userToken);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        window.location.href = '/login'; 
    }, []);

    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout,
    }), [user, token, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};