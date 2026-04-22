---
title: 开发面经
tag:
zh-CN: 技术博客
en: Technical Blog
date: 2026-04-02
description:
---

# 开发面经

## 大文件上传

### 1. 文件切片（Chunking）

大文件上传的核心难点在于网络波动导致的连接中断以及内存溢出。处理的第一步是将文件进行物理切片：

- 使用 File.slice() 方法将 File 对象切割成固定大小（如 5MB）的 Blob 片段。
- 利用 Promise.all 或并发控制队列将这些切片并行发送给后端。

```javascript
// 核心切片逻辑
const createFileChunks = (file, size = 5 * 1024 * 1024) => {
  const chunks = [];
  let cur = 0;
  while (cur < file.size) {
    chunks.push({ file: file.slice(cur, cur + size) });
    cur += size;
  }
  return chunks;
};
```

### 2. 生成文件唯一标识（Hash）

为了让后端识别切片的归属，必须计算文件的唯一哈希值（通常使用 MD5）：

- 采用 spark-md5 库计算文件哈希。
- 性能优化：由于大文件计算全量哈希非常耗时，实际操作中会使用 Web Worker 开启辅助线程，或采用“抽样哈希”算法（即取首、中、尾及部分字节进行哈希）来兼顾速度与准确性。

### 3. 秒传与断点续传（Checkpoint）

这是用户体验的关键。在正式上传前，先调用一个“验证接口”：

- 秒传（Speedy Upload）：后端检查该文件 Hash 是否已存在。若存在，直接返回上传成功，无需传输数据。
- 断点续传（Resume Upload）：若文件仅上传了一部分，后端返回已收到的切片索引列表。前端过滤掉这些切片，只上传缺失的部分。

### 4. 切片合并与清理

- 当所有切片上传完成后，前端发送一个“合并请求”。
- 后端根据 Hash 标识将所有切片按顺序合并成原始文件，并校验文件完整性。
- 合并完成后，后端清理临时存放切片的文件夹。

### 5. 交互与异常处理

- 进度条显示：利用 axios 的 onUploadProgress 事件监控每个切片的进度，通过计算已上传切片总和展示总进度。
- 并发控制：为了防止浏览器连接数超限导致页面卡顿，需要限制同时上传的请求数量（通常设置为 3-6 个）。
- 错误重试：当某个切片由于网络原因失败时，自动进行 2-3 次重试，若依然失败则记录状态等待用户手动恢复。

## 实现一个类似谷歌搜索框的功能

### 1. 核心交互逻辑

- 响应式监听：使用 Vue 的 v-model 绑定输入框，并通过 watch 监听搜索词变化，或者通过 @input 事件触发检索逻辑。
- 状态管理：需要维护搜索词（keyword）、候选列表（suggestions）、选中项索引（activeIndex）以及加载状态（loading）。
- 键盘导航：支持用户通过上下方向键（ArrowUp/Down）切换候选词，并按回车键（Enter）确认搜索，提升操作效率。

### 2. 性能优化（关键点）

- 防抖处理（Debounce）：这是搜索框的必备策略。避免用户每输入一个字符就发送请求，通常设置 300ms 左右的延迟，只有在输入停顿时才调用接口。
- 请求竞态处理：网络波动可能导致后发出的请求先返回。需要通过取消重复请求（如使用 Axios 的 CancelToken 或原生 AbortController）来确保页面最终展示的是最后一次输入对应的结果。
- 缓存机制：对于相同的关键词，可以在内存中使用 Map 进行简单缓存，减少不必要的后端压力。

### 3. 代码实现思路

在 Vue 3 中，推荐将搜索逻辑封装为组合式函数（Composables）：

```javascript
// 核心逻辑简述
const keyword = ref('');
const suggestions = ref([]);

// 防抖包装的搜索函数
const handleSearch = useDebounceFn(async (val) => {
  if (!val) {
    suggestions.value = [];
    return;
  }
  // 1. 中止之前的请求 (AbortController)
  // 2. 发起新请求
  const res = await fetchSuggestions(val);
  suggestions.value = res;
}, 300);

watch(keyword, (newVal) => {
  handleSearch(newVal);
});
```

### 4. 边界处理与细节

- 空状态与加载中：在请求时显示 loading 状态，如果搜索无结果，需明确展示“未找到相关内容”，避免用户困惑。
- 中文输入优化：利用 @compositionstart 和 @compositionend 事件。在用户输入拼音过程中不触发搜索，只有当汉字真正上屏后再进行检索。
- 样式与交互细节：
  - 点击搜索框外部（Click Outside）自动隐藏下拉列表。
  - 对匹配到的关键词进行高亮显示（通常通过正则替换为 span 标签并注入 class）。
- 安全处理：对用户输入的关键词进行 XSS 过滤，尤其是在将关键词回显到页面或渲染 HTML 高亮时。

### 5. 扩展能力

- 历史记录：结合本地存储（LocalStorage）实现搜索历史的保存与删除。
- 离线支持：对于固定类目的搜索，可以考虑预加载索引数据，在前端完成过滤。

## 判断元素是否在可视区域

### 1. Intersection Observer API（现代推荐方案）

这是目前最优雅且性能最优的方案。它是浏览器原生的观察者模式实现，异步检测目标元素与其祖先元素或视口的交叉状态。

- 优点：性能极高，不会阻塞主线程，不需要监听滚动事件。
- 核心代码：

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // 元素进入可视区域
        console.log('Element is visible');
      }
    });
  },
  { threshold: 0.1 },
); // 阈值，表示元素出现 10% 时触发

observer.observe(targetElement);
```

### 2. getBoundingClientRect（经典计算方案）

通过调用元素的 getBoundingClientRect() 方法获取其相对于视口的位置坐标，手动进行逻辑判断。

- 判断逻辑：元素的 top 小于视口高度，且 bottom 大于 0；同时 left 小于视口宽度，且 right 大于 0。
- 注意事项：必须配合滚动事件（scroll）使用，且务必引入防抖（Debounce）或节流（Throttle）来控制执行频率。
- 核心代码：

```javascript
function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom >= 0 &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
    rect.right >= 0
  );
}
```

### 3. offsetTop & scrollTop（传统计算方案）

通过计算元素的绝对偏移量与容器滚动条位置的差值来判断。

- 计算公式：el.offsetTop < (container.scrollTop + container.clientHeight)。
- 缺点：这种方式计算相对复杂，尤其在多层嵌套滚动或存在 CSS 变换（transform）时容易出错，目前已较少作为首选。

### 4. Vue 生态下的工程化实践

在 Vue 项目中，通常会将上述逻辑封装以提高复用性：

- 自定义指令（Directives）：封装一个 v-lazy 或 v-observe 指令，在 mounted 钩子中初始化 IntersectionObserver，在 unmounted 钩子中销毁。
- 组合式函数（Composables）：利用 VueUse 库中的 useIntersectionObserver，可以快速实现响应式的可见性判断。
- 第三方库：直接使用 vue-observe-visibility 等成熟方案。

### 5. 方案总结与选型

- 优先选择：Intersection Observer API。适用于大多数现代浏览器，能有效避免因监听滚动导致的页面卡顿（重排与重绘）。
- 备选方案：如果需要兼容极低版本的浏览器（如 IE），则使用 getBoundingClientRect 结合节流函数作为降级处理。

## 虚拟滚动

### 1. 核心原理

虚拟滚动的本质是“按需渲染”。它通过观察容器的滚动位移，只将当前可视区域内的几条数据渲染为真实的 DOM 节点。对于不可见区域，则通过一个巨大的撑高容器（Phantom Layer）或 CSS 偏移来模拟滚动的效果，让用户在视觉上感知不到长列表已经被“精简”了。

### 2. 结构组成

实现一个标准的虚拟滚动组件通常需要三个层级：

- 外层容器（Container）：固定高度，设置 overflow-y: auto，作为滚动监听的载体。
- 占位背景（Phantom/Spacer）：总高度为“单项高度 × 总数据量”，负责把滚动条撑起来，让用户可以进行原生滚动。
- 渲染列表（Actual List）：绝对定位在容器顶部，仅包含当前可见的 DOM 元素，随滚动动态更新内容和偏移位移。

### 3. 关键计算逻辑

在滚动事件（Scroll Event）中，需要实时计算并更新以下三个变量：

- 开始索引（startIndex）：Math.floor(scrollTop / itemHeight)。
- 结束索引（endIndex）：startIndex + Math.floor(containerHeight / itemHeight)。
- 列表偏移量（offset）：startIndex \* itemHeight。通过 transform: translateY 移动渲染列表，使其始终保持在可视区。

### 4. 代码实现示例（Vue 3 简述）

```javascript
// 核心逻辑：计算可视区域数据
const visibleData = computed(() => {
  return allData.slice(startIndex.value, endIndex.value + bufferCount);
});

// 核心逻辑：计算偏移量以防止列表随滚动滑出视口
const listOffset = computed(() => {
  return startIndex.value * itemHeight;
});
```

### 5. 性能与体验优化

- 缓冲区（Buffer）：在可视区上方和下方多渲染几行（如 3-5 行），防止用户快速滚动时出现短暂白屏。
- 变高处理：如果列表项高度不固定，需要先给予一个预估高度，并在 DOM 渲染后通过 ResizeObserver 获取实际高度并更新位置映射表。
- 节流与 RequestAnimationFrame：滚动事件触发频率极高，应使用 rAF 优化渲染帧率，确保滑动的平滑度。
- 动态回收：对于不再显示的组件实例，Vue 会自动处理销毁，配合虚拟滚动能极大地释放内存压力。

### 6. 使用场景

适用于后台管理系统的海量日志查看、电商平台的长列表商品展示、或者社交应用的消息列表。在 Vue 生态中，通常会优先考虑成熟的库如 vue-virtual-scroller，但在复杂自定义业务中，掌握底层实现原理是解决性能瓶颈的关键。

## 如何实现上拉加载、下拉刷新

### 1. 下拉刷新 (Pull-to-Refresh)

主要依赖于对触摸事件（Touch Events）的监听与位移计算。

- 实现逻辑：
  - 监听 touchstart：记录初始触摸位置的纵坐标。
  - 监听 touchmove：计算当前手指位置与初始位置的差值。当差值大于 0 时，通过 CSS 的 transform: translateY() 改变容器位置。同时需要通过条件判断（如 scrollTop === 0）确保只有在页面顶部时才触发。
  - 监听 touchend：判断下拉位移是否超过设定的阈值。若超过则进入“刷新中”状态，重置数据并调用接口；若未超过则回弹至初始位置。

- CSS 配合：
  - 使用 transition 增加回弹时的平滑效果。
  - 设置 will-change: transform 提升渲染性能。

### 2. 上拉加载 (Infinite Scroll)

核心在于监听滚动条位置，判断是否触达容器底部。

- 实现逻辑：
  - 监听滚动容器的 scroll 事件。
  - 判断条件：scrollTop + clientHeight >= scrollHeight - threshold。
  - 其中 threshold 为预留阈值（通常设为 50-100px），在用户感知到底部之前提前加载，确保体验连贯。

- 现代方案：
  - 推荐使用 Intersection Observer API。通过监听列表底部一个“哨兵”元素（Loading 占位符）是否进入可视区域，来自动触发加载函数。这种方式比 scroll 事件性能更好，不需要频繁计算像素值。

### 3. 核心代码示例 (Vue 3 逻辑)

```javascript
// 哨兵模式实现上拉加载
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && !loading.value && hasMore.value) {
      loadMoreData();
    }
  },
  { threshold: 0.5 },
);

// 模板引用后开始观察
onMounted(() => {
  observer.observe(loadMoreTrigger.value);
});
```

### 4. 关键状态管理

为了保证逻辑严密，必须严格控制以下四个状态：

- Loading（加载中）：请求发送中，此时应屏蔽重复的上拉或下拉操作（防抖/锁死）。
- Finished（已完结）：后端返回数据为空或达到总页数，此时停止触发上拉逻辑，并显示“没有更多了”。
- Error（错误）：请求失败时，需提供点击重新加载的机制。
- Pulling（下拉程度）：根据位移量实时更新 UI（如：下拉刷新 -> 释放立即刷新 -> 刷新中）。

### 5. 性能与体验优化

- 节流控制：如果使用 scroll 监听，必须配合 throttle 函数，减少计算频率。
- 虚拟列表：如果加载的数据量过大（如超过 500 条），应结合虚拟滚动技术，只渲染可视区节点，防止内存占用过高导致页面闪退。
- 离线提示：在网络断开时，下拉操作应给出明确的 Toast 提示，而不是让用户无限制等待。

## web攻击方式，如何防御

### 1. XSS (跨站脚本攻击)

原理：攻击者通过在页面注入恶意脚本，在用户浏览器上运行，从而窃取 Cookie 或进行非法操作。
防御策略：

- 输入过滤：对用户提交的所有内容进行严格的长度限制和格式校验。
- 转义输出：在 Vue 模板中，默认的 {{ }} 会自动转义 HTML，但使用 v-html 时必须极其谨慎。必须对动态渲染的 HTML 使用 DOMPurify 等库进行消毒。
- HTTP Only Cookie：后端设置 Cookie 时开启 HttpOnly 属性，脚本将无法通过 document.cookie 读取，切断窃取途径。
- 内容安全策略 (CSP)：通过配置 HTTP 响应头，限制浏览器只能加载特定域名的资源。

### 2. CSRF (跨站请求伪造)

原理：攻击者诱导用户访问恶意网站，利用用户在目标网站的登录状态（Cookie），冒充用户发送非法请求（如转义、购买）。
防御策略：

- SameSite Cookie：将 Cookie 的 SameSite 属性设置为 Strict 或 Lax，限制第三方网站携带 Cookie。
- CSRF Token：每次请求时在请求头中携带一个由服务器生成的随机 Token，攻击者无法获取该 Token，请求即失效。
- 验证 Referer/Origin：服务器端检查请求来源是否为可信域名。

### 3. SQL 注入

原理：通过在 Web 表单或 URL 参数中输入恶意的 SQL 语句，欺骗服务器执行非法的数据库查询。
防御策略：

- 参数化查询 (Prepared Statements)：这是最有效的手段。不直接拼接字符串，而是使用占位符，由数据库驱动处理转义。
- 最小权限原则：数据库账号仅赋予执行业务所需的最低权限（如禁止删除表权限）。

```javascript
// 错误示例：直接拼接
const query = 'SELECT * FROM users WHERE id = ' + req.query.id;

// 正确示例：参数化 (Node.js mysql2 库)
db.execute('SELECT * FROM users WHERE id = ?', [req.query.id]);
```

### 4. 点击劫持 (Clickjacking)

原理：将受害网站嵌入到透明的 iframe 中，诱导用户在不知情的情况下点击伪装后的按钮。
防御策略：

- X-Frame-Options：设置 HTTP 响应头为 DENY（禁止嵌套）或 SAMEORIGIN（仅允许同源嵌套）。
- Content-Security-Policy (CSP)：使用 frame-ancestors 指令限制哪些域名可以嵌入当前页面。

### 5. 其他安全实践

- HTTPS 全站加密：防止中间人攻击（MITM）和数据嗅探。
- HSTS (HTTP Strict Transport Security)：强制浏览器始终通过 HTTPS 访问。
- 依赖项安全扫描：定期使用 npm audit 检查前端项目的第三方库是否存在已知安全漏洞。
