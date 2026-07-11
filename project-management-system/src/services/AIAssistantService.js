const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

class AIAssistantService {
  constructor() {
    this.model = "gemini-3.1-flash-lite"; // Switch model to Gemini 2.5 Flash
  }

  async parseAssistantIntent(naturalLanguageCommand, history = []) {
    const tools = [
      {
        type: "function",
        function: {
          name: "route_assistant_request",
          description: "Phân loại ý định của người dùng để router backend xử lý an toàn theo quyền.",
          parameters: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["query_tasks", "query_projects", "create_task", "analyze_project", "unknown"],
                description: "Ý định chính của người dùng.",
              },
              scope: {
                type: "string",
                enum: ["assigned", "managed", "detail", "general"],
                description: "Phạm vi truy vấn task, chỉ dùng khi intent là query_tasks.",
              },
              projectName: { type: ["string", "null"], description: "Tên dự án được nhắc đến, nếu có." },
              projectStatus: {
                type: ["string", "null"],
                enum: ["active", "completed", "any", null],
                description: "Trạng thái dự án nếu người dùng nói rõ. Mặc định active.",
              },
              taskKey: { type: ["string", "null"], description: "Mã task nếu người dùng hỏi chi tiết một task cụ thể." },
              question: { type: ["string", "null"], description: "Câu hỏi phân tích dự án tổng quát nếu intent là analyze_project." },
              createTaskIntent: { type: "boolean", description: "Chỉ true khi người dùng nói rõ ý định tạo task và có mô tả đủ cụ thể." },
              sprintName: { type: ["string", "null"], description: "Tên Sprint nếu người dùng nhắc đến, ví dụ 'Sprint 1', 'Sprint 2'." },
              targetUser: { type: ["string", "null"], description: "Tên của nhân viên/member khác nếu người dùng muốn báo cáo hiệu suất hoặc hỏi về task của người đó." },
            },
            required: ["intent", "createTaskIntent"],
          },
        },
      },
    ];

    const systemContent = `Bạn là bộ phân loại ý định cho trợ lý quản lý dự án.
LUẬT BẮT BUỘC:
- Chỉ chọn intent = "create_task" khi người dùng có ý định tạo task thật sự và mô tả công việc cụ thể.
- Nếu người dùng hỏi danh sách dự án, dự án tôi tham gia, dự án tôi quản lý, hãy chọn intent = "query_projects".
- Nếu câu chỉ là hỏi danh sách, trạng thái, tiến độ, task của tôi, task tôi quản lý, task chi tiết, hãy chọn intent = "query_tasks".
- Nếu câu hỏi là phân tích rủi ro, workload, tiến độ dự án, hoặc yêu cầu sắp xếp/ưu tiên/lập lịch công việc, hãy chọn intent = "analyze_project".
- Nếu người dùng yêu cầu "sắp xếp", "ưu tiên", "lập lịch", "xếp thứ tự", "đề xuất kế hoạch", hãy coi đó là phân tích/đề xuất task và chọn intent = "analyze_project".
- Không dùng chữ "task" đơn thuần để suy ra tạo task.
- Mặc định projectStatus là "active" nếu người dùng không nói rõ completed.
- Nếu người dùng hỏi task của tôi / giao cho tôi -> scope = "assigned".
- Nếu người dùng hỏi task tôi quản lý / tôi phụ trách / tôi là leader / PM -> scope = "managed".
- Nếu người dùng hỏi chi tiết một task cụ thể -> scope = "detail" và điền taskKey.
- Nếu người dùng hỏi về task của người khác (VD: task của An Nguyen) -> điền targetUser.
- Nếu không rõ, chọn intent = "unknown".`;

    const messages = [{ role: "system", content: systemContent }];
    history.forEach((msg) => {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content || "" });
      }
    });
    messages.push({ role: "user", content: naturalLanguageCommand });

    const response = await openai.chat.completions.create({
      model: this.model,
      max_tokens: 800,
      messages,
      tools,
      tool_choice: { type: "function", function: { name: "route_assistant_request" } },
    });

    const responseMessage = response.choices[0].message;
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const funcCall = responseMessage.tool_calls[0].function;
      return {
        function: funcCall.name,
        params: JSON.parse(funcCall.arguments),
      };
    }

    return { function: "route_assistant_request", params: { intent: "unknown", createTaskIntent: false } };
  }

  // Cấp độ 1: Nhà Phân Tích (Phân tích rủi ro, workload, trả lời theo quyền)
  async analyzeProjectRisk(projectData, userQuestion, userInfo, history = []) {
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

3. NẾU USER HỎI SỐ LƯỢNG TASK HAY LIỆT KÊ TRONG 1 DỰ ÁN:
- Chú ý: Dữ liệu JSON truyền tới bạn là DANH SÁCH MỞ RỘNG gồm toàn bộ task từ NHIỀU dự án khác nhau!
- Bắt buộc bạn phải TỰ LỘC bằng tay qua trường "projectName" trùng khớp dự án được hỏi để được danh sách rút gọn.
- Sau khi được danh sách đó, hãy TỰ ĐẾM bằng tay ra con số chiều dài để trả lời.
- CẤM TIỆT việc lấy chiều dài tổng gốc (hay trường total) để gán cho 1 dự án riêng lẻ! Nhớ kĩ!

4. NẾU USER HỎI VỀ SPRINT HOẶC TASK REVIEWER:
- Dữ liệu cung cấp có chứa "sprintName". Hãy sử dụng nó nếu User hỏi về tiến độ Sprint.
- Nếu User hỏi ai review task (Ví dụ: "Task VIC-4 do ai review?"), hãy dựa vào thông tin "teamLeader" trong task (nếu có) để trả lời, vì Leader là người sẽ review code của Member.

5. TRẢ LỜI ĐA DẠNG CÁC CÂU HỎI VỀ THUỘC TÍNH TASK / PROJECT:
- Dùng tư duy logic để lọc (mức độ ưu tiên priority, trạng thái TO DO/IN Progress/DONE, Loại Bug/Feat...).
- Nếu người dùng hỏi "Hôm nay tôi có task nào?", hãy kiểm tra xem "dueDate" có phải là ngày hôm nay hoặc nằm trong giai đoạn hạn chót hôm nay không, hay đang Overdue. Hoặc liệt kê các task "In Progress" của họ.
- LƯU Ý VỀ MỨC ĐỘ ƯU TIÊN (Priority): Priority được đánh số, số 1 là ƯU TIÊN CAO NHẤT (Urgent/Highest), số càng lớn (2, 3, 4...) thì mức độ ưu tiên càng thấp. Hãy ưu tiên sắp xếp task có priority = 1 lên đầu.
- GẮN LINK TASK: Trong dữ liệu có trường "taskLink", khi nhắc đến bất kỳ task nào, bạn BẮT BUỘC phải gắn link vào tên task theo định dạng Markdown: \`[Tên Task](taskLink)\` để người dùng có thể click vào xem chi tiết.
- NẾU DANH SÁCH QUÁ DÀI (HƠN 9 TASK): Tuyệt đối không liệt kê toàn bộ. Bạn chỉ nên chọn ra 10-15 task quan trọng nhất (quá hạn, ưu tiên cao nhất, hoặc sắp đến hạn) để hiển thị chi tiết, phần còn lại chỉ tóm tắt số lượng để câu trả lời không bị cắt ngang.
- NẾU TÌM ĐƯỢC: Trình bày rõ ràng.
- NẾU KHÔNG TÌM ĐƯỢC HOẶC KHÔNG BIẾT DỮ LIỆU CHÍNH XÁC: Phải trả lời thành thật là "Hiện tại không có dữ liệu" hoặc "Bạn không có quyền truy cập". Không bịa đặt dữ liệu (TUYỆT ĐỐI KHÔNG ẢO GIÁC HALLUCINATION).

LUÔN LUÔN: Xưng "Tôi" và gọi người dùng bằng tên. Dựa vào ĐÚNG DỮ LIỆU ĐƯỢC CUNG CẤP ở dưới.`;

    const prompt = `CÂU HỎI CỦA NGƯỜI DÙNG: "${userQuestion || "Dựa trên dữ liệu, hãy phân tích rủi ro của dự án. Có ai đang bị quá tải không?"}"

Dữ liệu (chỉ là những task Backend cấp sát quyền cho user):
${JSON.stringify(projectData, null, 2)}

---
LỜI NHẮC QUAN TRỌNG TỪ HỆ THỐNG: 
1. TUYỆT ĐỐI KHÔNG liệt kê quá 9 task trong câu trả lời để tránh bị cắt ngang (vượt quá giới hạn text). Nếu người dùng có hàng chục/hàng trăm task, bạn CHỈ chọn ra 10 task cấp bách/ưu tiên nhất để hiển thị chi tiết, và gom phần còn lại thành 1 câu tóm tắt (ví dụ: "Bạn còn 45 task khác chưa hoàn thành...").
2. BẮT BUỘC dùng định dạng \`[Tên Task](taskLink)\` cho các task được nhắc đến.`;
    try {
      // Chuẩn bị message format gồm cả lịch sử để AI không quên context (Session memory)
      const formattedHistory = history.map((msg) => ({ role: msg.role, content: msg.content }));

      // Lịch sử gửi sang từ Controller ở msg cuối cùng là "question"
      // Ta cần gán content đó thành câu prompt chứa thông tin projectData + câu hỏi để AI phân tích
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === "user") {
        formattedHistory[formattedHistory.length - 1].content = prompt;
      } else {
        formattedHistory.push({ role: "user", content: prompt });
      }

      const response = await openai.chat.completions.create({
        model: this.model,
        max_tokens: 8192,
        messages: [{ role: "system", content: systemPrompt }, ...formattedHistory],
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error("AI Analysis Error:", error);

      // Try to detect a 402 / credit limit message and retry with fewer tokens if possible
      const rawMsg = (error && (error.error?.message || error.message)) || "";
      const affordMatch = rawMsg.match(/afford(?:ed)?(?:[^\d]*(\d+))/i) || rawMsg.match(/(\d+) tokens/i);
      const affordable = affordMatch ? Number(affordMatch[1]) : null;

      if (error.status === 402 || error.code === 402 || affordable) {
        const retryMax = affordable ? Math.max(512, affordable - 50) : 1000;
        try {
          console.warn(`AI Analysis: retrying with reduced max_tokens=${retryMax}`);
          const retryResponse = await openai.chat.completions.create({
            model: this.model,
            max_tokens: retryMax,
            messages: [{ role: "system", content: systemPrompt }, ...formattedHistory],
          });
          return retryResponse.choices[0].message.content;
        } catch (retryErr) {
          console.error("AI Analysis Retry Error:", retryErr);
          // rethrow the original error so caller can react to 402 properly
          throw error;
        }
      }

      // For other errors, rethrow so the controller can handle/display appropriate message
      throw error;
    }
  }

  // Cấp độ 2: Thư Ký Thực Thi (Function Calling tạo JSON Tool)
  async parseTaskCommand(naturalLanguageCommand, history = []) {
    const tools = [
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Tạo một hoặc nhiều task mới cho dự án. Trả về cấu trúc JSON để Backend xử lý.",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                description:
                  "Danh sách task cần tạo. Nếu người dùng yêu cầu nhiều task trong cùng một prompt, phải trả về tất cả task vào mảng này thay vì chỉ 1 task. Nếu chỉ có 1 task, mảng vẫn phải có 1 phần tử.",
                items: {
                  type: "object",
                  properties: {
                    taskName: {
                      type: "string",
                      description:
                        "Tên công việc cần làm (VD: 'Làm giao diện đăng nhập'). KIỂM TRA NGHIÊM NGẶT: Nếu câu của người dùng chỉ là lệnh chung chung như 'tạo task cho dự án', 'tạo thêm task', 'add task' mà không có MÔ TẢ HÀNH ĐỘNG CỤ THỂ nào sẽ làm trong dự án đó, thì BẮT BUỘC để null. Tuyệt đối không lấy chính câu ra lệnh (ví dụ 'tạo task cho dự án X') làm giá trị cho trường này.",
                    },
                    projectName: { type: "string", description: "Tên dự án mà task này thuộc về (vd: 'ABC', 'Dự án Mobile')" },
                    assigneeName: { type: "string", description: "Tên người được giao task (vd: 'An', 'Bình')" },
                    sprintName: { type: "string", description: "Tên sprint (vd: 'Sprint 1', 'S2')" },
                    platformName: { type: "string", description: "Nền tảng (vd: 'BE', 'FE', 'iOS')" },
                    priorityLevel: { type: "string", description: "Mức độ ưu tiên (vd: 'High', 'Low', 'Medium')" },
                    taskTypeName: { type: "string", description: "Loại công việc (vd: 'Task', 'Bug', 'Story', 'Epic')" },
                    statusName: { type: "string", description: "Trạng thái của task (vd: 'To Do', 'In Progress', 'Done', 'Review')" },
                    startDate: { type: "string", description: "Ngày bắt đầu (Y-M-D) (vd: '2026-03-16')" },
                    dueDate: { type: "string", description: "Ngày kết thúc, hạn chót (Y-M-D) (vd: '2026-03-20')" },
                    description: { type: "string", description: "Mô tả task, nếu người dùng cung cấp" },
                  },
                  required: [],
                },
              },
              taskName: {
                type: "string",
                description:
                  "Giữ tương thích ngược cho trường hợp cũ chỉ trả về 1 task. Nếu có tasks thì bỏ qua trường này.",
              },
              projectName: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              assigneeName: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              sprintName: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              platformName: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              priorityLevel: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              taskTypeName: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              statusName: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              startDate: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
              dueDate: { type: "string", description: "Giữ tương thích ngược cho trường hợp cũ." },
            },
            required: [],
          },
        },
      },
    ];

    try {
      const systemContent =
        "Bạn là hệ thống trích xuất thông tin tạo Task từ đoạn chat. Nhiệm vụ của bạn là xem ĐOẠN HỘI THOẠI và trích xuất thông tin người dùng yêu cầu tạo mới để điền vào function create_task. Nếu người dùng yêu cầu tạo NHIỀU task, bạn hãy GỌI FUNCTION NÀY NHIỀU LẦN (parallel function calling). LUẬT NGUYÊN TẮC: Bạn chỉ trích xuất 'taskName' nếu người dùng nêu RÕ CÔNG VIỆC CỤ THỂ cần làm (như 'sửa lỗi', 'viết api', 'thiết kế ui', 'viết tài liệu'). NẾU câu lệnh CHỈ LÀ YÊU CẦU TẠO TASK CHUNG CHUNG MÀ KHÔNG CÓ CHI TIẾT (vd: 'tạo task cho dự án X' hoặc 'thêm 1 task'), bạn BẮT BUỘC để trống (null) 'taskName'. Ngày hôm nay là " +
        new Date().toISOString().split("T")[0];

      let messages = [{ role: "system", content: systemContent }];

      // Xây dựng ngữ cảnh với các tin nhắn trước
      history.forEach((msg) => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content || "" });
        }
      });
      // Thêm câu lệnh thực tại của người dùng
      messages.push({ role: "user", content: naturalLanguageCommand });

      const response = await openai.chat.completions.create({
        model: this.model,
        max_tokens: 1500,
        messages: messages,
        tools: tools,
        tool_choice: { type: "function", function: { name: "create_task" } },
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCalls = responseMessage.tool_calls.filter((call) => call.function.name === "create_task");
        const normalizedCalls = [];

        for (const call of toolCalls) {
          const parsedArguments = JSON.parse(call.function.arguments || "{}");
          if (Array.isArray(parsedArguments.tasks) && parsedArguments.tasks.length > 0) {
            parsedArguments.tasks.forEach((taskItem) => {
              normalizedCalls.push({
                function: call.function.name,
                params: taskItem,
              });
            });
            continue;
          }

          normalizedCalls.push({
            function: call.function.name,
            params: parsedArguments,
          });
        }

        return normalizedCalls;
      }

      return [];
    } catch (error) {
      console.error("AI Command Parsing Error:", error);
      throw new Error("Failed to parse task command.");
    }
  }
}

module.exports = new AIAssistantService();
