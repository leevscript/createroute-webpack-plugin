# create-route

## 使用
![image](https://pic3.zhuanstatic.com/zhuanzh/n_v24595d76146fd4ea7b52b9b0cedd24d8f.png)
```
plugins: [
  new CreateRoute({
    pagesDir: 'src/view', // vue页面位置
    mixin: { // 定义混入属性
      'l': {
        meta: {
          auth: true
        }
      }
    }
  })
]
```

### 生成router.js文件
```
export default [
	{
		path: "/test",
		component: () => import("./view/test.vue"),
		name: "test"
	},
	{
		path: "/double-11",
		component: () => import("./view/double-11/index.vue"),
		name: "double-11_index"
	},
	{
		path: "/404",
		component: () => import("./view/404.vue"),
		name: "404"
	},
	{
		path: "/double-11/draw",
		component: () => import("./view/double-11/draw l.vue"),
		meta: {"auth":true},
		name: "double-11_draw"
	},
	{
		path: "/double-11/result",
		component: () => import("./view/double-11/result.vue"),
		name: "double-11_result"
	}
]
```

## 删除路由

在文件夹或者vue文件名前加"!"符号

## 首页路由

在文件夹里有'index.vue'文件时，被认为是该路由首页，路由中不显示'index'

## 动态路由
当文件以'_'开头时，被认为是动态路由，文件名为params

## 嵌套路由
当文件中vue文件与子文件夹名字相同时，被认为是嵌套路由，该vue组件里需有"<router-view></router-view>"作为父组件

![image](https://pic2.zhuanstatic.com/zhuanzh/n_v2c1ee88ecdb614713925f62476ae7eef9.png)

```
export default [
	{
		path: "/test",
		component: () => import("./view/test.vue"),
		children: [
			{
				path: "",
				component: () => import("./view/test/index.vue"),
				name: "test_index"
			},
			{
				path: "a",
				component: () => import("./view/test/a.vue"),
				children: [
					{
						path: "",
						component: () => import("./view/test/a/index.vue"),
						name: "test_a_index"
					},
					{
						path: "b",
						component: () => import("./view/test/a/b.vue"),
						name: "test_a_b"
					}
				]
			},
			{
				path: ":id?",
				component: () => import("./view/test/_id.vue"),
				name: "test_id"
			}
		]
	},
	{
		path: "/404",
		component: () => import("./view/404.vue"),
		name: "404"
	}
]
```

## 混入属性
在mixin中定义的混入属性，在生成路由时，会判断文件名里是否有改属性的key，（用空格分开）如果有，则将改属性混入路由属性中
```
mixin: {
  'l': {
    meta: {
      auth: true
    }
  }
}
```
文件路径： 'src/view//double-11/draw l.vue'，生成文件：
```
{
	path: "/double-11/draw",
	component: () => import("./view/double-11/draw l.vue"),
	meta: {"auth":true},
	name: "double-11_draw"
}
```
