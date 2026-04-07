if (platformName) {
            const platform = await Platform.findOne({
                name: new RegExp(platformName, 'i'),
                $or: [{ projectId: taskData.projectId }, { projectId: null }]
            });
            if (platform) taskData.platformId = platform._id;
        }

        if (priorityLevel) {
            const safePriorityLevel = priorityLevel.trim();
            const priority = await Priority.findOne({ 
                name: new RegExp(`^${safePriorityLevel}$`, 'i'),
                $or: [{ projectId: taskData.projectId }, { projectId: null }]
            });
            if (priority) {
                taskData.priorityId = priority._id;
            } else {
                const defaultPriority = await Priority.findOne({ level: '2', $or: [{ projectId: taskData.projectId }, { projectId: null }] });
                if (defaultPriority) taskData.priorityId = defaultPriority._id;
            }
        } else {    
            const defaultPriority = await Priority.findOne({ level: '2', $or: [{ projectId: taskData.projectId }, { projectId: null }] });
            if (defaultPriority) taskData.priorityId = defaultPriority._id;
        }

        if (taskTypeName) {
            const safeTaskTypeName = taskTypeName.trim();
            const taskType = await TaskType.findOne({ 
                name: new RegExp(`^${safeTaskTypeName}$`, 'i'),
                $or: [{ projectId: taskData.projectId }, { projectId: null }]
            });
            if (taskType) {
                taskData.taskTypeId = taskType._id;
            } else {
                const defaultTaskType = await TaskType.findOne({ name: 'Task', $or: [{ projectId: taskData.projectId }, { projectId: null }] });
                if (defaultTaskType) taskData.taskTypeId = defaultTaskType._id;
            }
        } else {
            const defaultTaskType = await TaskType.findOne({ name: 'Task', $or: [{ projectId: taskData.projectId }, { projectId: null }] });
            if (defaultTaskType) taskData.taskTypeId = defaultTaskType._id;
        }

        