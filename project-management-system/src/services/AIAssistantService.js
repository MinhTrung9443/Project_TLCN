const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
        "X-Title": process.env.OPENROUTER_APP_NAME,
    }
});

class AIAssistantService {
    constructor() {
        this.model = process.env.OPENAI_MODEL || "openai/gpt-4o-mini";
    }

    // Cấp độ 1: Nhà Phân Tích (Phân tích rủi ro, workload, trả lời theo quyền)
    async analyzeProjectRisk(projectData, userQuestion, userInfo) {
        let systemPrompt = `Bạn là Trợ lý ảo Quản lý Dự án AI (Analyst) của hệ thống.
Thông tin về User đang trò chuyện với bạn:
- Tên: ${userInfo.fullName}
- Email: ${userInfo.email}
- Quyền hệ thống: ${userInfo.isSystemAdmin ? "Admin toàn quyền" : "User bình thường"}
- Vai trò dự án (Project Roles): ${JSON.stringify(userInfo.projectRoles)}

Nhiệm vụ của bạn:
1. HIỂU VÀ ÁP DỤNG QUYỀN HẠN (RBAC) KHI USER HỎI:
- Phân tích User đang hỏi với tư cách/vai trò gì (Ví dụ: "Task tôi quản lý với vai trò Leader", "Tôi làm PM dự án nào").
- Nếu User là Admin toàn quyền: Thoải mái hiển thị và phân tích mọi task.
- Nếu User KHÔNG phải Admin: 
    + Nếu user muốn xem các task của ĐỘI NHÓM/DỰ ÁN mà họ QUẢN LÝ (với vai trò LEADER hoặc PROJECT_MANAGER), bạn CHỈ được lọc các task thuộc các dự án có "role" tương ứng là "LEADER" hoặc "PROJECT_MANAGER" trong [Vai trò dự án] ở trên.
    + Nếu user chỉ là "MEMBER" trong một dự án nào đó, bạn TUYỆT ĐỐI KHÔNG ĐƯỢC tiết lộ task của người khác trong dự án đó cho họ xem. Bất kể user hỏi gì về dự án đó, bạn chỉ hiển thị các task giao trực tiếp cho họ.
    + Nếu user yêu cầu điều sai quyền hạn (Ví dụ đòi xem task dự án khác mà họ làm Member, hoặc dự án không tham gia): Lịch sự từ chối và giải thích quyền hạn.

2. NẾU USER HỎI VỀ CÔNG VIỆC CỦA CHÍNH HỌ (có các từ "của tôi", "giao cho tôi"):
- Bạn CHỈ ĐƯỢC PHÉP lấy những task có trường "assignee" TRÙNG KHỚP HOÀN TOÀN với Email (${userInfo.email}) hoặc Tên (${userInfo.fullName}). 
- QUAN TRỌNG: TUYỆT ĐỐI KHÔNG lấy task của người khác đắp vào.

3. TRẢ LỜI ĐA DẠNG CÁC CÂU HỎI VỀ THUỘC TÍNH TASK / PROJECT:
- Dùng tư duy logic để lọc (mức độ ưu tiên, trạng thái TO DO/IN PROGRESS/DONE, Loại Bug/Feat...).
- NẾU TÌM ĐƯỢC: Trình bày rõ ràng.
- NẾU KHÔNG TÌM ĐƯỢC: Phải trả lời thành thật là "Hiện tại không có task nào thỏa mãn điều kiện" hoặc "Bạn không có quyền truy cập". Không bịa đặt dữ liệu (ảo giác).

LUÔN LUÔN: Xưng "Tôi" và gọi người dùng bằng tên. Dựa vào ĐÚNG DỮ LIỆU ĐƯỢC CUNG CẤP ở dưới.`;

        const prompt = `CÂU HỎI CỦA NGƯỜI DÙNG: "${userQuestion || 'Dựa trên dữ liệu, hãy phân tích rủi ro của dự án. Có ai đang bị quá tải không?'}"

Dữ liệu (chỉ là những task Backend cấp sát quyền cho user):
${JSON.stringify(projectData, null, 2)}
`;
        try {
            const response = await openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ]
            });
            return response.choices[0].message.content;
        } catch (error) {
            console.error("AI Analysis Error:", error);
            throw new Error("Failed to analyze project risk via AI.");
        }
    }

    // Cấp độ 2: Thư Ký Thực Thi (Function Calling tạo JSON Tool)
    async parseTaskCommand(naturalLanguageCommand) {
        const tools = [
            {
                type: "function",
                function: {
                    name: "create_task",
                    description: "Tạo một task mới cho dự án. Trả về cấu trúc JSON để Backend xử lý.",
                    parameters: {
                        type: "object",
                        properties: {
                            taskName: { type: "string", description: "Tên công việc cần làm (VD: 'Làm giao diện đăng nhập'). KIỂM TRA NGHIÊM NGẶT: Nếu câu của người dùng chỉ là lệnh chung chung như 'tạo task cho dự án', 'tạo thêm task', 'add task' mà không có MÔ TẢ HÀNH ĐỘNG CỤ THỂ nào sẽ làm trong dự án đó, thì BẮT BUỘC TRẢ VỀ null. Tuyệt đối không lấy chính câu ra lệnh (ví dụ 'tạo task cho dự án X') làm giá trị cho trường này." },
                            projectName: { type: "string", description: "Tên dự án mà task này thuộc về (vd: 'ABC', 'Dự án Mobile')" },
                            assigneeName: { type: "string", description: "Tên người được giao task (vd: 'An', 'Bình')" },
                            sprintName: { type: "string", description: "Tên sprint (vd: 'Sprint 1', 'S2')" },
                            platformName: { type: "string", description: "Nền tảng (vd: 'BE', 'FE', 'iOS')" },
                            priorityLevel: { type: "string", description: "Mức độ ưu tiên (vd: 'High', 'Low', 'Medium')" },
                            taskTypeName: { type: "string", description: "Loại công việc (vd: 'Task', 'Bug', 'Story', 'Epic')" },
                            statusName: { type: "string", description: "Trạng thái của task (vd: 'To Do', 'In Progress', 'Done', 'Review')" },
                            startDate: { type: "string", description: "Ngày bắt đầu (Y-M-D) (vd: '2026-03-16')" },
                            dueDate: { type: "string", description: "Ngày kết thúc, hạn chót (Y-M-D) (vd: '2026-03-20')" }
                        },
                        // Bỏ required "taskName" để tránh LLM bịa ra tên task khi user nói chung chung
                        required: []
                    }
                }
            }
        ];

        try {
            const response = await openai.chat.completions.create({
                model: this.model,
                messages: [{ role: "system", content: "Bạn là hệ thống trích xuất thông tin tạo Task từ văn bản. LUẬT NGUYÊN TẮC QUAN TRỌNG: Bạn chỉ trích xuất 'taskName' nếu người dùng nêu rõ RÕ CÔNG VIỆC CỤ THỂ cần làm (như 'sửa lỗi', 'viết api', 'thiết kế ui'). NẾU câu lệnh chỉ là yêu cầu RẤT CHUNG CHUNG ví dụ như 'tạo task cho dự án X' hoặc 'thêm 1 task' MÀ KHÔNG CÓ CHI TIẾT CÔNG VIỆC CỤ THỂ BÊN TRONG, bạn BẮT BUỘC bỏ trống (null) 'taskName'." }, { role: "user", content: `Trích xuất thông tin tạo task từ ĐOẠN HỘI THOẠI sau (nếu có ngày tháng như 'hôm nay', hãy dùng gốc là ${new Date().toISOString().split('T')[0]}): "${naturalLanguageCommand}"` }],
                tools: tools,
                tool_choice: { type: "function", function: { name: "create_task" } }
            });

            const responseMessage = response.choices[0].message;

            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                const funcCall = responseMessage.tool_calls[0].function;
                return {
                    function: funcCall.name,
                    params: JSON.parse(funcCall.arguments)
                };
            }
            return null;
        } catch (error) {
            console.error("AI Command Parsing Error:", error);
            throw new Error("Failed to parse task command.");
        }
    }
}

module.exports = new AIAssistantService();