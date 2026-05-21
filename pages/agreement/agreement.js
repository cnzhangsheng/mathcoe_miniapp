// pages/agreement/agreement.js - 协议查看页面
Page({
  data: {
    type: 'user-service',
    title: '用户服务协议',
    content: '',
  },

  onLoad(options) {
    const type = options.type || 'user-service'
    const config = {
      'user-service': {
        title: '用户服务协议',
        content: this.getUserServiceContent(),
      },
      'privacy': {
        title: '隐私政策',
        content: this.getPrivacyContent(),
      },
    }

    const pageData = config[type] || config['user-service']
    this.setData({
      type,
      title: pageData.title,
      content: pageData.content,
    })
    wx.setNavigationBarTitle({ title: pageData.title })
  },

  getUserServiceContent() {
    return [
      { type: 'title', text: '欢迎使用袋鼠数学助理' },
      { type: 'paragraph', text: '本协议是您（以下简称"用户"）与袋鼠数学助理（以下简称"我们"）之间关于使用袋鼠数学助理小程序服务所订立的协议。请您仔细阅读本协议的全部内容（特别是以粗体标注的内容）。' },
      { type: 'subtitle', text: '一、服务内容' },
      { type: 'paragraph', text: '1. 袋鼠数学助理是一款面向小学生的数学竞赛练习平台，提供在线练习、AI测评、题库训练等服务。' },
      { type: 'paragraph', text: '2. 我们有权根据实际情况调整服务内容，并对服务内容进行升级或变更。' },
      { type: 'paragraph', text: '3. 我们保留随时变更、中断或终止部分或全部服务的权利。' },
      { type: 'subtitle', text: '二、用户账户' },
      { type: 'paragraph', text: '1. 用户使用微信授权登录后获得账户，账户仅限本人使用。' },
      { type: 'paragraph', text: '2. 用户应妥善保管账户信息，因账户信息泄露导致的损失由用户自行承担。' },
      { type: 'paragraph', text: '3. 用户不得将账户转让、出借或以任何方式允许第三方使用。' },
      { type: 'subtitle', text: '三、用户行为规范' },
      { type: 'paragraph', text: '1. 用户在使用本服务时应遵守国家法律法规，不得利用本服务从事违法违规活动。' },
      { type: 'paragraph', text: '2. 用户不得利用技术手段破坏或干扰本服务的正常运行。' },
      { type: 'paragraph', text: '3. 用户不得对本服务进行反向工程、反向编译或反汇编。' },
      { type: 'subtitle', text: '四、知识产权' },
      { type: 'paragraph', text: '1. 本服务中包含的所有内容（包括但不限于文字、图片、音频、视频、题库等）的知识产权归我们所有。' },
      { type: 'paragraph', text: '2. 未经我们书面许可，用户不得以任何方式复制、传播、修改或商业性使用上述内容。' },
      { type: 'subtitle', text: '五、免责声明' },
      { type: 'paragraph', text: '1. 我们将尽力提供稳定、持续的服务，但不对服务完全无中断做出任何保证。' },
      { type: 'paragraph', text: '2. 在法律允许的范围内，我们不对因使用或无法使用本服务产生的任何间接损失承担责任。' },
      { type: 'subtitle', text: '六、协议变更' },
      { type: 'paragraph', text: '我们有权根据需要修改本协议，修改后的协议将在页面公布后生效。如用户继续使用服务，则视为接受变更后的协议。' },
      { type: 'subtitle', text: '七、联系我们' },
      { type: 'paragraph', text: '如对本协议有任何疑问，请通过小程序内的"意见反馈"功能联系我们。' },
    ]
  },

  getPrivacyContent() {
    return [
      { type: 'title', text: '隐私政策' },
      { type: 'paragraph', text: '袋鼠数学助理（以下简称"我们"）深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。' },
      { type: 'subtitle', text: '一、信息收集' },
      { type: 'paragraph', text: '1. 微信授权信息：当您使用微信登录时，我们收集您的微信昵称、头像等公开信息。' },
      { type: 'paragraph', text: '2. 学习数据：我们收集您的练习记录、答题情况、错题等学习数据，用于提供个性化学习分析和推荐。' },
      { type: 'paragraph', text: '3. 设备信息：我们可能会收集您的设备型号、操作系统版本等信息，用于优化服务体验。' },
      { type: 'subtitle', text: '二、信息使用' },
      { type: 'paragraph', text: '1. 我们收集的信息仅用于为您提供、优化和维护本服务。' },
      { type: 'paragraph', text: '2. 我们不会将您的个人信息用于与提供服务无关的目的。' },
      { type: 'paragraph', text: '3. 我们可能会使用学习数据进行统计分析，但不会识别到个人身份。' },
      { type: 'subtitle', text: '三、信息存储与保护' },
      { type: 'paragraph', text: '1. 您的个人信息将存储在中国境内的服务器上。' },
      { type: 'paragraph', text: '2. 我们采用行业标准的安全措施保护您的个人信息，包括但不限于SSL加密传输、数据加密存储等。' },
      { type: 'paragraph', text: '3. 我们将合理确定个人信息保存期限，超出必要期限后将进行删除或匿名化处理。' },
      { type: 'subtitle', text: '四、信息共享' },
      { type: 'paragraph', text: '1. 我们不会向第三方出售您的个人信息。' },
      { type: 'paragraph', text: '2. 我们可能在以下情况下共享您的信息：（1）获得您的明确同意；（2）法律法规要求；（3）保护我们或第三方的合法权益。' },
      { type: 'subtitle', text: '五、未成年人保护' },
      { type: 'paragraph', text: '1. 本服务面向小学生，我们非常重视对未成年人个人信息的保护。' },
      { type: 'paragraph', text: '2. 我们建议未成年人在监护人的指导下使用本服务，并征得监护人的同意。' },
      { type: 'paragraph', text: '3. 监护人应对未成年人的账号使用行为进行监督和管理。' },
      { type: 'subtitle', text: '六、您的权利' },
      { type: 'paragraph', text: '您有权查询、更正、删除您的个人信息，以及撤回同意和注销账户。您可以通过小程序内的相关功能或联系我们行使上述权利。' },
      { type: 'subtitle', text: '七、政策更新' },
      { type: 'paragraph', text: '我们可能会适时修订本隐私政策。变更后的政策将在页面公布后生效。' },
      { type: 'subtitle', text: '八、联系我们' },
      { type: 'paragraph', text: '如对隐私政策有任何疑问，请通过小程序内的"意见反馈"功能联系我们。' },
    ]
  },
})