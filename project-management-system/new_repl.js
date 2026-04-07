        if (platformName) {
            let platform = await Platform.findOne({ name: new RegExp('^' + platformName.trim() + '$', 'i'), projectId: taskData.projectId });
            if (!platform) platform = await Platform.findOne({ name: new RegExp('^' + platformName.trim() + '$', 'i'), projectId: null });
            if (platform) taskData.platformId = platform._id;
        }

        if (priorityLevel) {
            const safePriorityLevel = priorityLevel.trim();
            let priority = await Priority.findOne({ name: new RegExp('^' + safePriorityLevel + '$', 'i'), projectId: taskData.projectId });
            if (!priority) priority = await Priority.findOne({ name: new RegExp('^' + safePriorityLevel + '$', 'i'), projectId: null });
            if (priority) taskData.priorityId = priority._id;
        }
        
        if (!taskData.priorityId) {
            let defaultPriority = await Priority.findOne({ level: '2', projectId: taskData.projectId });
            if (!defaultPriority) defaultPriority = await Priority.findOne({ level: '2', projectId: null });
            if (defaultPriority) taskData.priorityId = defaultPriority._id;
        }

        if (taskTypeName) {
            const safeTaskTypeName = taskTypeName.trim();
            let taskType = await TaskType.findOne({ name: new RegExp('^' + safeTaskTypeName + '$', 'i'), projectId: taskData.projectId });
            if (!taskType) taskType = await TaskType.findOne({ name: new RegExp('^' + safeTaskTypeName + '$', 'i'), projectId: null });
            if (taskType) taskData.taskTypeId = taskType._id;
        }
        
        if (!taskData.taskTypeId) {
            let defaultTaskType = await TaskType.findOne({ name: 'Task', projectId: taskData.projectId });
            if (!defaultTaskType) defaultTaskType = await TaskType.findOne({ name: 'Task', projectId: null });
            if (defaultTaskType) taskData.taskTypeId = defaultTaskType._id;
        }

        if (statusName) {
            const workflow = await Workflow.findOne({ projectId: taskData.projectId });
            if (workflow) {
                const matchedStatus = workflow.statuses.find((s) => s.name.toLowerCase().includes(statusName.toLowerCase()) || s.category.toLowerCase().includes(statusName.toLowerCase()));
                if (matchedStatus) taskData.statusId = matchedStatus._id;
            }
        }
