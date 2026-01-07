# WeChat Template Message Service

微信模板消息服务组件,用于通过微信公众号API发送模板消息。

## 功能特性

- ✅ 自动获取和缓存 access_token
- ✅ 支持发送模板消息
- ✅ 支持自定义模板ID
- ✅ 支持跳转链接和小程序
- ✅ 完整的 TypeScript 类型支持
- ✅ 使用原生 fetch API,无需额外依赖

## 配置

### 1. 环境变量配置

在 `.env` 文件中添加以下配置:

```bash
# WeChat Official Account (Template Messages)
WECHAT_APPID="your_wechat_appid"
WECHAT_APPSECRET="your_wechat_appsecret"
WECHAT_TEMPLATE_ID="your_template_id_here"
```

### 2. 获取配置信息

- **WECHAT_APPID**: 微信公众号的 AppID
- **WECHAT_APPSECRET**: 微信公众号的 AppSecret
- **WECHAT_TEMPLATE_ID**: 默认使用的模板消息ID

这些信息可以在 [微信公众平台](https://mp.weixin.qq.com/) 获取。

## 使用方法

### 基础用法

```typescript
import { wechatTemplateService } from '@/lib/wechat-template';

// 发送简单的模板消息
const result = await wechatTemplateService.sendTemplateMessage(
  'user_openid',  // 用户的 OpenID
  {
    first: {
      value: '您好,您有新的消息',
      color: '#173177'
    },
    keyword1: {
      value: '系统通知'
    },
    keyword2: {
      value: new Date().toLocaleString('zh-CN')
    },
    remark: {
      value: '点击查看详情',
      color: '#FF0000'
    }
  }
);
```

### 带跳转链接的消息

```typescript
await wechatTemplateService.sendTemplateMessage(
  'user_openid',
  {
    first: { value: '订单状态更新' },
    keyword1: { value: '订单已发货' },
    keyword2: { value: new Date().toLocaleString('zh-CN') },
    remark: { value: '点击查看物流信息' }
  },
  {
    url: 'https://your-domain.com/order/123'  // 点击消息后跳转的链接
  }
);
```

### 跳转到小程序

```typescript
await wechatTemplateService.sendTemplateMessage(
  'user_openid',
  {
    first: { value: '任务完成通知' },
    keyword1: { value: '任务已完成' },
    keyword2: { value: new Date().toLocaleString('zh-CN') },
    remark: { value: '点击进入小程序查看' }
  },
  {
    miniprogram: {
      appid: 'your_miniprogram_appid',
      pagepath: 'pages/task/detail?id=123'
    }
  }
);
```

### 使用自定义模板ID

```typescript
await wechatTemplateService.sendCustomTemplate(
  'user_openid',
  'custom_template_id',  // 自定义的模板ID
  {
    keyword1: { value: '自定义消息内容' },
    keyword2: { value: new Date().toLocaleString('zh-CN') }
  }
);
```

## API 参考

### `sendTemplateMessage(touser, data, options?)`

发送模板消息(使用默认模板ID)

**参数:**
- `touser` (string): 接收者的 OpenID
- `data` (WeChatTemplateData): 模板数据对象
- `options` (可选):
  - `url` (string): 点击消息后跳转的链接
  - `miniprogram` (object): 小程序配置
    - `appid` (string): 小程序的 AppID
    - `pagepath` (string): 小程序页面路径

**返回值:** Promise<WeChatSendResponse>

### `sendCustomTemplate(touser, templateId, data, options?)`

发送自定义模板消息

**参数:**
- `touser` (string): 接收者的 OpenID
- `templateId` (string): 自定义模板ID
- `data` (WeChatTemplateData): 模板数据对象
- `options` (可选): 同上

**返回值:** Promise<WeChatSendResponse>

### `getAccessToken()`

获取微信 access_token (自动缓存)

**返回值:** Promise<string>

## 类型定义

```typescript
interface WeChatTemplateData {
  [key: string]: {
    value: string;
    color?: string;  // 可选的颜色值,如 '#173177'
  };
}

interface WeChatSendResponse {
  errcode: number;    // 错误码,0表示成功
  errmsg: string;     // 错误信息
  msgid?: number;     // 消息ID
}
```

## 示例代码

查看 `src/lib/wechat-template-example.ts` 获取更多使用示例。

## 注意事项

1. **OpenID 获取**: 需要先获取用户的 OpenID,可以通过微信网页授权或其他方式获取
2. **模板消息限制**: 
   - 每个用户每月最多接收4条模板消息
   - 需要在微信公众平台添加模板消息模板
3. **Token 缓存**: access_token 会自动缓存,有效期约2小时(实际缓存时间为返回的过期时间减去5分钟)
4. **错误处理**: 建议使用 try-catch 捕获可能的错误

## 错误处理示例

```typescript
try {
  const result = await wechatTemplateService.sendTemplateMessage(
    openId,
    templateData
  );
  console.log('消息发送成功:', result);
} catch (error) {
  console.error('消息发送失败:', error);
  // 处理错误,如记录日志、重试等
}
```

## 相关链接

- [微信公众平台](https://mp.weixin.qq.com/)
- [模板消息接口文档](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html)
- [获取 access_token](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html)
