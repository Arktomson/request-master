export interface Setting {
    disasterRecoveryProcessing: boolean;
    disasterRecoveryIsProcessUrl: string[];
    doYouWantToEnableHijacking: boolean;
    allowToInjectOrigin: {
        type: "regex" | "fully" | "include";
        domain: string;
    }[];
    [key: string]: any; // 添加索引签名
    sidebarIfCacheState: boolean;
    sideBarLastVisible: boolean;
    mockList: any[];
    monitorEnabled: boolean;
    mockEnabled: boolean;
}