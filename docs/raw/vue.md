---
title: Vue 面经
tag:
zh-CN: 技术博客
en: Technical Blog
date: 2026-03-17
description: Vue 组件性能优化方式
---

# Vue 面经

## Vue 组件性能优化方式

### 1. 设计维度（架构与拆分）

- **组件细粒度拆分**：将复杂的页面拆分为多个独立的小组件。这样当局部状态变化时，仅相关的子组件会触发重绘，避免整个页面的虚拟 DOM 全量对比。
- **路由懒加载**：利用 Webpack 或 Vite 的动态导入功能 `() => import('./View.vue')`。配合路由配置，实现按需加载页面资源，显著减少首屏体积。
- **长列表优化**：对于海量数据展示，采用虚拟滚动（Virtual List）技术。仅渲染可视区域内的 DOM 节点，通过固定高度和位移模拟滚动效果，从根本上解决 DOM 节点过多导致的卡顿。
- **Keep-alive 缓存**：对频繁切换的路由或组件（如搜索页、详情页）使用 `<Keep-alive>`。缓存组件实例以避免重复的渲染与初始化开销。

### 2. Script 维度（逻辑与状态）

- **浅层响应式处理**：对于纯展示的大型对象或数组，使用 `shallowRef` 或 `shallowReactive`。跳过深层递归响应式转换，大幅提升初始化速度。
- **非响应式数据脱离**：无需在模板中使用的变量，直接定义为普通变量或通过 `Object.freeze()` 冻结。避免 Vue 追踪不必要的依赖。
- **计算属性（Computed）优于侦听器（Watcher）**：优先使用计算属性，利用其缓存机制，只有在依赖项改变时才重新计算。
- **副作用清理**：在 `onUnmounted` 生命周期内，务必手动清除定时器、事件监听（如 window.addEventListener）以及第三方库实例，防止内存泄漏。
- **控制频繁操作**：在处理输入框搜索或窗口缩放等高频事件时，必须引入防抖（Debounce）或节流（Throttle）。

### 3. Template 维度（渲染与编译）

- **合理使用 v-show 与 v-if**：频繁切换显示状态的元素使用 `v-show`（CSS 切换）；渲染条件极少改变的元素使用 `v-if`（减少初始 DOM 压力）。
- **严格规范 v-for 的 key 值**：禁止使用 index 作为 key。使用唯一标识符（如 ID）确保 Diff 算法能高效复用现有节点。
- **v-for 与 v-if 互斥**：严禁在同一标签上同时使用两者。建议通过计算属性预过滤数据，或在父级、子级包裹 `template` 标签处理条件。
- **v-once 与 v-memo**：
  - `v-once`：用于渲染后永不更新的静态内容。
  - `v-memo`：Vue 3.2+ 引入，根据依赖条件跳过子树更新，在长列表渲染中极具优势。

### 4. 其他维度（构建与资源）

- **Tree Shaking**：在编写组件库或工具函数时采用 ES Modules 规范，确保构建工具能剔除未使用的代码（Dead Code）。
- **按需引入插件**：针对 Element Plus、Ant Design 等 UI 组件库，配置插件实现按需引入，避免将整个库打包进首屏。
- **图片资源处理**：对于组件内的图片，采用懒加载技术（Intersection Observer）或小图标 Base64 化，减少网络请求链路。

## vue 组件间通信方式

### 1. 父子组件通信（最常用）

- Props / Emits：这是 Vue 的核心单向数据流。父组件通过 Props 向下传递数据，子组件通过 Emits 触发事件向上通知父组件更新。
- v-model：Vue 3 中 v-model 的本质是绑定了 modelValue 属性和 update:modelValue 事件的语法糖，适用于实现自定义表单控件。
- Template Refs / Expose：父组件通过 ref 获取子组件实例。在 Vue 3 中，子组件需通过 defineExpose 明确暴露给父组件的属性或方法。

### 2. 跨级组件通信（祖孙或深层嵌套）

- Provide / Inject：祖先组件通过 provide 提供数据，任何后代组件都可以通过 inject 接收。这种方式避免了“Props 逐层透传（Prop Drilling）”的问题。注意：若需保持响应式，需提供 Ref 或 Reactive 对象。
- Attributes（$attrs）：用于传递未在 Props 或 Emits 中声明的属性和事件。常用于二次封装第三方组件库，通过 v-bind="$attrs" 将属性直接透传给内部组件。

### 3. 全局状态管理（非关系组件/复杂业务）

- Pinia / Vuex：当多个组件共享同一状态或业务逻辑极其复杂时，应使用官方推荐的状态管理库 Pinia。它通过 Store 存储全局状态，支持 DevTools 调试和插件扩展。
- Mitt / EventBus：虽然 Vue 3 移除了内置的 $on / $emit 实例方法，但可以通过第三方库如 mitt 实现简单的发布订阅模式。这种方式适用于完全解耦的组件（如弹窗通知）。

### 4. 逻辑复用与状态共享

- Composables（组合式函数）：这是 Vue 3 的精髓。通过将逻辑封装在独立的 .js 或 .ts 文件中，不同的组件可以导入同一个函数来共享状态或逻辑。这在某种程度上替代了传统的 Mixins，且更加透明、易于维护。

```javascript
// 示例：Composables 共享状态
import { ref } from 'vue';
const globalCount = ref(0); // 定义在函数外部实现跨组件共享
export function useCounter() {
  return { globalCount };
}
```

### 总结与选型习惯

在实际开发中，应遵循以下思维习惯：

- 优先使用 Props 和 Emits，保持数据流向清晰。
- 只有在 Props 传递超过三层时，才考虑使用 Provide / Inject。
- 涉及多个页面共享、需要持久化或多人协作的复杂业务数据，直接进入 Pinia 状态池。
- 对于纯逻辑的抽离，优先使用 Composables。

## vue 权限管理

### 1. 页面级权限（路由守卫）

这是最核心的防线，通过控制路由访问权限防止用户非法进入未授权页面。

- 静态路由与动态路由：将通用路由（如登录、404）放在静态配置中。将权限路由（asyncRoutes）存放在前端或由后端返回，根据用户角色动态计算。
- 核心实现：利用 router.beforeEach 钩子，在跳转前校验用户 token 和角色。若未授权，重定向至登录或 404 页面。
- 动态添加路由：使用 router.addRoute() 动态注入用户有权访问的路由表，确保侧边栏菜单与路由表实时同步。

### 2. 视图级权限（指令与组件）

针对页面内的具体功能点（如按钮、操作项）进行控制，通常采用 RBAC（基于角色的权限访问控制）模型。

- 自定义指令：封装全局指令 v-permission。

```javascript
// 实现示例
const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding; // 获取指令绑定的权限标识
    const userPermissions = store.state.user.permissions; // 获取用户拥有的权限列表
    if (value && !userPermissions.includes(value)) {
      el.parentNode && el.parentNode.removeChild(el); // 无权限则移除 DOM
    }
  },
};
```

- 函数式判断：对于无法使用指令的场景（如异步组件或条件渲染），封装全局方法 checkPermission()，结合 v-if 使用。

### 3. 接口级权限（拦截器）

前端权限控制仅是提高用户体验，安全性最终由后端兜底。

- 请求拦截：在 Axios 拦截器中统一注入 Authorization Token，确保每个请求都携带身份凭证。
- 响应拦截：处理 401（未授权）或 403（禁止访问）状态码。一旦捕获此类异常，自动触发前端退出登录逻辑并清理缓存的状态。

### 4. 逻辑级权限（数据隔离）

- 状态存储：用户权限数据应存储在 Pinia 或 Vuex 中，并进行持久化处理，防止页面刷新导致权限丢失。
- 菜单过滤：侧边栏组件应通过计算属性（Computed）根据权限路由表自动生成，确保用户看不到任何无法点击的入口。

### 5. 权限切换与清理

- 动态替换：当用户切换角色或登出时，必须调用 resetRouter（通过新建 router 实例替换原实例）来清空之前动态添加的路由，防止权限残留导致的安全隐患。
- 数据闭环：从后端返回的菜单树、前端生成的路由表、指令控制的按钮权限，三者应共用一套权限标识符（Permission String），实现全链路一致。

## vue keepalive

### 1. 核心定义与作用

Keep-alive 是 Vue 的内置抽象组件，用于缓存内部的动态组件。当组件在切换过程中被包裹在 Keep-alive 中时，其实例会被存储在内存中而非销毁。这不仅能保留组件的渲染状态（如滚动位置、表单输入），还能避免重复渲染导致的性能开销。

### 2. 生命周期逻辑

被缓存的组件会新增两个专有的生命周期钩子，这是面试中的核心考察点：

- activated：组件被切入（激活）时触发。此时可以执行数据刷新、启动定时器等操作。
- deactivated：组件被切出（停用）时触发。此时应清理临时逻辑或停止不必要的轮询。
  注意：被缓存组件的 mounted 和 unmounted 只会在首次加载和最终销毁时触发一次。

### 3. 核心属性与配置

Keep-alive 通过三个核心属性实现精准控制：

- include：定义哪些组件需要被缓存（支持字符串、正则、数组）。
- exclude：定义哪些组件绝对不被缓存（优先级高于 include）。
- max：指定最大缓存实例数。采用 LRU（最近最少使用）算法，当达到上限时，最久未被访问的实例将被销毁以释放内存。

### 4. 路由结合与实际代码

在 Vue Router 中，通常配合 v-slot 语法来实现页面级的缓存。

```html
<router-view v-slot="{ Component }">
  <keep-alive :include="['Home', 'List']" :max="10">
    <component :is="Component" />
  </keep-alive>
</router-view>
```

### 5. 内部原理与思维习惯

- 内存权衡：Keep-alive 的本质是“空间换时间”。在开发时，仅对交互复杂、数据量大且用户频繁返回的页面（如搜索结果页、多级表单）开启缓存，避免内存占用过高。
- 抽象组件：Keep-alive 本身不渲染 DOM，也不会出现在父组件链中。
- 状态重置需求：如果某些页面需要在每次进入时彻底重置状态，应利用 exclude 排除或在 activated 钩子中手动初始化数据。

### 6. 常见问题处理

- 缓存失效：确保被缓存的组件拥有明确的 name 属性，因为 include/exclude 匹配的是组件定义的 name。
- 滚动位置丢失：虽然 Keep-alive 保持了 DOM 状态，但部分浏览器的 window 滚动条可能复位。通常在 deactivated 中记录 scrollY，在 activated 中通过 window.scrollTo 还原。
