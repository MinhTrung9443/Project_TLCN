import apiClient from "./apiClient";

export const getGanttData = async (filter, groupby) => {
    try{
        const response = await apiClient.post('/gantt/data', {filter, groupby});
        return response.data;
    }
    catch(error){
        throw error;
    }
}