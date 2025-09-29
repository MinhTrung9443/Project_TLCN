const Project = require('../models/Project');
const TaskType = require('../models/TaskType');
const Priority = require('../models/Priority');
const Platform = require('../models/Platform');

const getCreateTaskFormData = async (req, res) => {
    try {
        const { projectKey } = req.params;
        const project = await Project.findOne({ key: projectKey.toUpperCase() }).populate('members.userId', 'fullname');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        const projectId = project._id;

        const findTaskTypes = TaskType.find({ projectId });
        const findPriorities = Priority.find({ projectId }).sort({ level: 'asc' });
        const findPlatforms = Platform.find({ projectId });
                const [taskTypes, priorities, platforms, sprints] = await Promise.all([
            findTaskTypes,
            findPriorities,
            findPlatforms,
        ]);

        res.status(200).json({
            taskTypes,
            priorities,
            platforms,
            members: project.members || []
        });

    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

module.exports = { getCreateTaskFormData };