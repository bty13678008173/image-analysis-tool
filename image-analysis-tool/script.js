// 1. 绑定DOM元素（和HTML对应）
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const resultDiv = document.getElementById('result');

// 2. 点击自定义按钮，触发原生文件选择框
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

// 3. 监听文件选择事件（用户选完图片后执行）
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]; // 获取选中的图片文件
    if (!file) return; // 没选文件则退出

    // 3.1 显示图片预览
    const reader = new FileReader();
    reader.onload = (event) => {
        imagePreview.src = event.target.result;
        imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file); // 把图片转成base64格式（预览+后续传接口）

    // 3.2 显示加载状态
    resultDiv.innerHTML = '<div class="loading">正在识别...请稍候</div>';

    try {
        // 3.3 第一步：获取百度API的访问令牌（Access Token）
        const accessToken = await getBaiduAccessToken();
        
        // 3.4 第二步：调用百度图像识别接口（通用物体识别，可识别常见物体）
        const imageBase64 = await fileToBase64(file); // 把文件转成纯base64字符串（接口要求）
        const analysisResult = await callBaiduImageApi(accessToken, imageBase64);
        
        // 3.5 显示识别结果（格式化输出）
        displayResult(analysisResult);
    } catch (error) {
        // 错误处理（如网络问题、密钥错误）
        resultDiv.innerHTML = `<div style="color: red;">识别失败：${error.message}</div>`;
    }
});

// 4. 工具函数1：获取百度API的Access Token（需要替换成你的密钥！）
async function getBaiduAccessToken() {
    // 替换成你在百度智能云创建的应用的 API Key 和 Secret Key！！！
    const API_KEY = "f9wbUUJBf2QLNYH0dvkf1iSE"; // 👉 这里改！粘贴你保存的API Key
    const SECRET_KEY = "9ZB3d4cFshEBIy02oaGd4TG1E78DpEJh"; // 👉 这里改！粘贴你保存的Secret Key

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;
    
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`获取令牌失败：${data.error_description}`);
    }
    return data.access_token; // 返回令牌（有效期30天，无需频繁获取）
}

// 5. 工具函数2：把图片文件转成纯base64字符串（去掉前缀，接口要求）
function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            // 去掉base64前缀（如"data:image/jpeg;base64,"），只保留后面的字符串
            const base64 = event.target.result.split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(file);
    });
}

// 6. 工具函数3：调用百度图像识别接口（通用物体识别）
async function callBaiduImageApi(accessToken, imageBase64) {
    const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${accessToken}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded' // 接口要求的格式
        },
        body: `image=${encodeURIComponent(imageBase64)}` // 传图片base64（需URL编码）
    });

    const data = await response.json();
    if (data.error_code) {
        throw new Error(`接口调用失败：${data.error_msg}（错误码：${data.error_code}）`);
    }
    return data;
}

// 7. 工具函数4：格式化并显示识别结果
function displayResult(data) {
    if (data.result.length === 0) {
        resultDiv.innerHTML = '<div>未识别到任何物体</div>';
        return;
    }

    // 拼接结果（显示物体名称、置信度（准确率））
    let resultHtml = '<h3>识别结果（按准确率排序）：</h3><ul>';
    data.result.forEach((item, index) => {
        const name = item.keyword; // 物体名称
        const confidence = (item.score * 100).toFixed(2); // 置信度（转成百分比，保留2位小数）
        resultHtml += `<li>${index + 1}. ${name}（准确率：${confidence}%）</li>`;
    });
    resultHtml += '</ul>';
    resultDiv.innerHTML = resultHtml;
}