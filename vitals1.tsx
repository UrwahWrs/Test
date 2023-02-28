import React, { memo, useLayoutEffect, useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList,PermissionsAndroid, Alert,TouchableOpacity,Image,ActivityIndicator ,NativeModules,NativeEventEmitter,EventEmitter,Platform, Modal} from 'react-native';
import Text from 'elements/Text';
import scale from 'utils/scale'; 
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Routes } from 'configs';
import ButtonIconHeader from 'elements/Buttons/ButtonIconHeader';
import { useTheme } from 'configs/ChangeTheme'
import { AVATAR } from 'images/Avatar';
import { useAppDispatch, useAppSelector } from "Redux/ReduxPresist/ReduxPersist";
import Container from 'elements/Layout/Container';
import { getBottomSpace } from 'react-native-iphone-x-helper'; 
import { BleManager, BleRestoredState } from 'react-native-ble-plx';
import base64 from 'react-native-base64' 
import ButtonLinear from 'elements/Buttons/ButtonLinear';
import useBackButton from 'hooks/useBackButton';
import RadioButtonRN from "radio-buttons-react-native"
// import { 
//   checkBluetoothPermission, 
// } from 'react-native-google-nearby-messages';
import VitalsInformation from "./VitalsInformation";
import { 
  WaveIndicator,
} from 'react-native-indicators';
import {Colors} from 'configs';
import Theme from 'style/Theme';
import VitalsDeviceDataDispaly from './VitalsDeviceDataDispaly';
import {sendVitalsValues} from 'Actions/Vitals/sendVitalsValues';
import BluetoothStateManager from 'react-native-bluetooth-state-manager';
import { setIn } from 'formik';
import WeighingModule from '../../Module/WeighingModule';
import ModalSelect from 'components/ModalSelect';
import useModalAnimation from 'hooks/useModalAnimation';
import { fastingStatusOptions } from 'configs/Data';
import { PatientEventStatus } from 'Actions/PatientEventStatus';
import { vitalsListsAction } from 'Actions/Vitals';
import { ICON } from 'images/Icon';
import { IMAGE } from 'images/Image';
import { NotificationStatus } from 'Actions/NotificationStatus';
import AppLoader from 'components/AppLoader';
import { statusOptions,VitalsList, vitalStatusOptions } from 'configs/Data';
import {createTwoButtonAlert} from 'utils';
var hex64 = require('hex64');

const VitalsConnection = memo((props) => {
  const dispatch = useAppDispatch()
  const profileInfo=useAppSelector((state)=>state.profile.data?.patient);
  const vitalsList=useAppSelector((state)=>state.vitalsList);
  const { navigate, setOptions, goBack } = useNavigation();
  const [isConnected, setIsConnected] = useState(false)
  const [SPo2, setSPo2] = useState<number|null>(null);
  const [PR, setPR] = useState<number|null>(null);
  const [highblood, setHighBlood] = useState<number|null>(null);
  const [lowblood, setLowBlood] = useState<number|null>(null);
  const [temprature, setTemprature] = useState<number|null>(null);
  const [glucometerValue, setGlucometerValue] = useState<any|null>(null);
  const [weight, setWeight] = useState<number|null>(null);
  const [selectedDevice, setSelectedDevice] = useState<any>();
  const [selectedValue, setSelectedValue] = useState(false);
  const [bloodGlucoseConditions, setBloodGlucoseCondition] = useState<any>();
  const [beforScanning, setBeforScanning] = useState(false)
  const [afterScanning, setAfterScanning] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const [deviceScan, setDeviceScan] = useState(false)
  const [deviceUuid, setDeviceUuid] = useState<any>();
  const [deviceFound, setDeviceFound] = useState(false)
  const [deviceConnect, setDeviceConnect] = useState(true)
  const [devices, setDevices] = useState<any>()
  const [BGMSelect,setBGMSelect] = useState(false);
  const [setLoader,setIsLoading] = useState(false)
  const data = [
    {
      label: 'Fasting'
     },
     {
      label: 'Random'
     }
    ];
  const { theme } = useTheme();
  let Counter:number = 0;
  console.log("Device...........",props?.route.params.device);
  console.log("Props...........",props?.route.params.Props);
  // let bleManager = new BleManager();
  let bleManager = new BleManager({
    restoreStateIdentifier: 'bleManagerRestoredState',
    restoreStateFunction: (bleRestoredState: BleRestoredState) => {
      if (bleRestoredState == null) {
        // BleManager was constructed for the first time.
      } else {
        // BleManager was restored. Check `bleRestoredState.connectedPeripherals` property.
      }
    },
  });
 
  const bluetoothDisable=()=>{
    BluetoothStateManager.disable().then((result) => {
      // do something...
      console.log("Result ",result);
    });
  }

  const bluetoothEnable=()=>{
    BluetoothStateManager.enable().then((result) => {
      console.log("Result ",result);
      
      return result;
      // do something...
    });
  }
  let deviceconnect:boolean = false; 
  const getVitalsList = useCallback(() => {
    dispatch(vitalsListsAction(profileInfo?.profileAbleID))
    }, []);
  useLayoutEffect(() => {
    setOptions({
      title: props?.route.params.device?.name,
      headerBackground: () => (
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      ),
      headerLeft: () => (
        <ButtonIconHeader marginRight={24} tintColor={theme.text} 
        //onPress={goBackScreen} 
        />
      ),
    });
  }, [setOptions]);
  const stopDeviceScan = () => {
    bleManager.stopDeviceScan()
    setDeviceScan(false)
  }
  useFocusEffect(
    React.useCallback(() => {
      console.log("Props..........",props?.route?.params.Props)
      console.log("device",props?.route?.params?.device)
      getVitalsList();
     setSelectedDevice(props?.route?.params?.device)
    }, []),
  );
  const SetPatientEventStatus:any = useCallback((param:any) => {
    console.log("Get patient Event status",param)
    setLoading(true);
    dispatch(PatientEventStatus(param)).then((res:any) =>{
      res.type=="PatientEventStatus/fulfilled"?navigateEventStatusAction(res): navigateEventStatusError(res.payload)
    })
  },[]);
  const navigateEventStatusError = useCallback(async (action) => {
    setLoading(false);
    action.errors?Alert.alert(action.errors[0]):Alert.alert("Networking On Patient Status Error")
  }, []);
  const navigateEventStatusAction = useCallback(async (res) => {
    setLoading(false);
    Alert.alert("Result Submitted Successfully")

    console.log("Get Patient Event Status ",res.payload.data)
  }, []);
 
  const setDeviceValue=(value:any)=>{
     console.log("Devices Name",devices.name);
    if(devices.name==='PRT Server'){
      Counter++;
      setSPo2(value[4])
      setPR(value[3])
      value[4] && value[3] && setSelectedValue(true)
    }  

    if(devices.name==='AOJ-70B'){
      // console.log("Oximeter Value",value.length)
      if(value.length<=4){
        Counter++;
        setSPo2(value[2])
        setPR(value[1])
        value[2] && value[1] && setSelectedValue(true)
      }
    }  
    else if(devices.name==='AOJ-20A'){
      if(value.length==8){
        Counter++;
        let highTempHex = value[4].toString(16).toUpperCase();
        let lowTempHex = value[5]<=15 ? 0+value[5].toString(16).toUpperCase() : value[5].toString(16).toUpperCase();
        let combineHextodecimal = parseInt(highTempHex+lowTempHex,16);
        let preciseValue=parseFloat(((combineHextodecimal/100*1.8)+ 32).toFixed(1))
         setTemprature(preciseValue)
        preciseValue && setSelectedValue(true)
      }else{
        Alert.alert("Please Take Body Temperature Not Surface Temperature");
      }
    } 
    else if(devices.name==='T101P��\u0002J�YX'){
      console.log("Thermometer Value",value)
        let temp=new Int32Array(value.buffer);
        console.log("temp",temp);
        console.log("temp",temp[1]);
    let preciseValue=parseInt(((temp[1]/10 * 9/5)+ 32 ).toFixed(1))
       console.log("preciseValue",preciseValue);
       Counter++;
         setTemprature(preciseValue)
         preciseValue && setSelectedValue(true)
    } 
    else if(devices.name==='Bioland-BPM'){
      Counter++;
      value[9]&&setHighBlood(value[9])
      value[11]&& setLowBlood(value[11])
      value[12]&& setPR(value[12])
      value[9] && value[11] && value[12] && setSelectedValue(true)
      } 
    else if(devices.name==='Bioland-BGM'){
      Counter++;
      let preciseValue=value[9];
      preciseValue=  (preciseValue/18).toFixed(1);
      preciseValue && setGlucometerValue(preciseValue)
      preciseValue && setSelectedValue(true)
      } 
  }
  const getValueIndex=()=>{
    if(devices.name==='PRT Server') return 1;
    else if(devices.name==='T101P��\u0002J�YX') return 0
    else if(devices.name==='Bioland-BPM') return 1
    else if(devices.name==='Bioland-BGM') return 1
    else if(devices.name==='AOJ-70B') return 0
    else if(devices.name==='AOJ-20A') return 0
    else if(devices.name==='MY_SCALE') return 1
  }
  const requestBLEPermissions = async () => {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
    await PermissionsAndroid.requestMultiple([ PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT])
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT).then(async response => { 
      if(response===true){
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then(async resp=> { 
          if(resp===true){
          startDeviceScan()
          } else{
            createTwoButtonAlert();
          }
        })
      }
      else{
        createTwoButtonAlert();
      }
    })
    console.log(res)
  }


  const startDeviceScan = () => {
    console.log("device name....","SelectedDevice....",selectedDevice)
    if(selectedDevice.deviceName == "MY_SCALE"){

      console.log("Weighing Scale",WeighingModule)
      if(Platform.OS == "ios"){
        
        bluetoothEnable();
        WeighingModule.ScanDevice();
      }else{
       
        WeighingModule.ScanDevice("kumail","ABC", (data:string) => {
          console.log(`event id ${data} returned`);
        })
      } 
       
      bluetoothEnable()
      if(bluetoothEnable!=null)
      {
        setBeforScanning(true)
        setDevices([])
        setDeviceScan(true) 
      }
    }
    else{
      console.log("Non Scalee Device");
    bluetoothEnable()
    if(bluetoothEnable!=null)
    {
      console.log("No Weighing Scale bluetooth enable")

      setBeforScanning(true)
      setDevices([])
      setDeviceScan(true) 
      bleManager.startDeviceScan(null, {allowDuplicates: true}, async (error, device: any) => {
        console.log("No Weighing Scale bluetooth enable start device scan......",device)
        if (error) {    
          bluetoothEnable();
          if(deviceconnect){
            setInterval(()=>{startDeviceScan()
            console.error(error, "errorerrorerror")},1000)
            
          }
        }
        else if (device.name === selectedDevice.deviceName) 
        {
          console.log("Device Data.....",device)
          stopDeviceScan()
          setDevices(device)
          console.log("Set Device Found true",deviceFound);
          setDeviceFound(true)
          deviceconnect=true; 
        }
      });
    }
  }
  }
  const DuringScan = () => {
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT).then(async response => { 
      if(response===true){
        startDeviceScan();
   
      }
      else{
        requestBLEPermissions();
      }
      
  })
  }

  const startConnecting = () => {
    console.log("Start Connecting",devices)
    try {
      devices.connect().then((device: any) => {
        console.log("Start Connect device",devices)
        return device.discoverAllServicesAndCharacteristics()
       }).then(async(device:any) => {
        console.log("device",device);
        monitorCharacter(device) 
     })
       .catch((error: any) => {
        Alert.alert("Reconnecting...!!","Please Try Again");
        setAfterScanning(false)
        setIsConnected(false)
         console.log(error, "Handle errors"); 
       }); 
    } catch (error) {
      // Alert.alert("Your device is offline. Please try again!!")
      startDeviceScan()
    }    
  }
  function hexToBase64(str:any) {
    return btoa(String.fromCharCode.apply(null,
      str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
    );
  }
  const monitorCharacter = async (device: any) => {
    const services = await device.services();
    // console.log("Services",JSON.stringify(services));
    const characteristics = device.name == "MY_SCALE" ? await services[3].characteristics() :await services[2].characteristics() ; 
    let index:any=getValueIndex()
    // console.log("Characteristics",characteristics);
    // console.log("Index",index);

    setTimeout(()=> deviceConnected(characteristics[index].id, device),2000);
    // characteristics&&Alert.alert(
    // "Device is Connected",
    // "The data tested by the health medical device app is only for a health reference and not to be used for medical diagnosis. Please check with doctor before making any medical decision. We hereby declare that we are not responsible for consequences caused by improper operation for professional diagnosis or treatment.",
    // [  { text: "OK", onPress:()=> deviceConnected(characteristics[index].id) }
    // ]
    // );
     device.monitorCharacteristicForService(characteristics[index].serviceUUID, characteristics[index].uuid, (error: any, characteristic: any) => {
      if (error) {
        console.log(error.message,"khjbjhbjs")
        return
      } 
     let value = _base64ToArrayBuffer(characteristic.value)
       setDeviceValue(value)
    })
  }
  const deviceConnected = async (uuid:any,device:any) => {
    console.log("Device Connected ........",uuid,"     .........      ",device.name)
    setTimeout ( async () => {
    setIsConnected(true)
    setDeviceUuid(uuid)
    setAfterScanning(true)},500)
    if(device.name == "Bioland-BGM")
    {
      setBGMSelect(true)
    }
  }
 
const Refresh = () => { 
  
 }
  const onSessionConnect = (event) => {
    console.log(event.eventProperty) // "someValue"
 }
  useEffect(() => {
    setSelectedDevice(props?.route.params.device)
    console.log('useEffect..........', props?.route.params.Props,"                       ",props?.route.params.device)
    if(Platform.OS == "ios"){
      try{
        const eventEmitter = new NativeEventEmitter(NativeModules.WeighingModule);
        console.log("Event Emitter...",eventEmitter);
          eventEmitter.addListener("EventReminder",(event: any) => {
            // console.log("Weighing Scale Value ",event) // "someValue"
            let DhartiParWazan:string = (event)
            // console.log("DhartiParWazan Value ",DhartiParWazan) // "someValue"
            let weight:number =parseFloat(DhartiParWazan);
            // console.log("Weighing Scale Value ",weight.toFixed(2)) // "someValue"
            let Weight:string = weight.toFixed(2);
            setDeviceFound(true)
            setAfterScanning(true)
            setIsConnected(true)
            setSelectedValue(true)
            setWeight(parseFloat(Weight));  
        });
        eventEmitter.addListener("KnowScanRemainder",(event: any) => {
          console.log("KnowScanRemainder",event) // "someValue"
        });
      }catch(error){
        console.error("Error Message",error);
      }
    }else{
      try{
        const eventEmitter = new NativeEventEmitter();
        console.log("Event Emitter...",eventEmitter);
        eventEmitter.addListener("EventReminder",(event: any) => {
          console.log("Weighing Scale Value ",event) // "someValue"
          let DhartiParWazan:string = (event.Weight)
          console.log("DhartiParWazan Value ",DhartiParWazan) // "someValue"
          let weight:number =parseFloat(DhartiParWazan);
          console.log("Weighing Scale Value ",weight.toFixed(2)) // "someValue"
          let Weight:string = weight.toFixed(2);
          setDeviceFound(true)
          setAfterScanning(true)
          setIsConnected(true)
          setSelectedValue(true)
          setWeight(parseFloat(Weight));  
       });
  
      }catch(error ){
        console.error("Error Message",error);
      }
    }
    bluetoothEnable()
    setSelectedDevice(props?.route.params.device)
    setDevices([]) 
     return ()=>{
       console.log("Component Will Unmount");
       deviceconnect=false;
    console.log("Go Back",bleManager);
    if(isConnected){
      if(bleManager !=null){
        stopDeviceScan()
        bleManager.destroy()
        }
    }}

  }, [])

  const submitValue = useCallback(() => {
    setIsLoading(true);
    if( props?.route.params.device.deviceName == "Bioland-BGM"){
      onChangeStatus(bloodGlucoseConditions)
    }else{
      setIsLoading(true);
      bleManager.stopDeviceScan()
      setDeviceScan(false)    
      bleManager.destroy()
      bluetoothDisable();  
      let date=new Date((Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString()
      .substring(0, new Date((Date.now() - (new Date()).getTimezoneOffset() * 60000))
      .toISOString().length - 1).replace(/\.\d+/, '');
      let obj=
      {
      vitalsList:vitalsList.data,
      profileAbleID:profileInfo?.profileAbleID,
      source_name:props?.route.params.device?.name,
      source_id:props?.route.params.Props.device_id,
      // source_id:devices?.name !== "Body Scale" ? props?.route.params.device?.deviceName : devices?.name,
      reading_type:'device',
      date:date,
      userId:profileInfo?.userId,
      SPo2:SPo2,
      PR:PR,
      weight:weight,
      highblood:highblood,
      lowblood:lowblood,
      temprature:temprature,
      glucometerValue:glucometerValue ? parseFloat((glucometerValue*18).toFixed(2)):undefined,
      gender:profileInfo?.gender
    }
    console.log("Object ",obj)
      dispatch(sendVitalsValues(obj)).then((res) => {
        res.type=="/fulfilled"?navigateVitalAction(res): navigateVitalError(res.payload)
      })
    }
  }, [SPo2,PR,highblood,lowblood,temprature,glucometerValue,profileInfo,vitalsList,weight]);
 const navigateVitalError = useCallback(async (action) => {
  setLoading(false);
},[])
 const navigateVitalAction = useCallback(async (res) => {
  setLoading(false);
    console.log("Result Submitted........",props?.route?.params.Props);
    // Alert.alert("Result Submitted........",res)
    let params = {
      id:props?.route?.params.Props?.id,
      status:'done',
      status_color:'#22b14c'
    }
    SetPatientEventStatus(params);
    goBack()  }, []);
  useEffect(() => {
    setSelectedDevice(props?.route.params.device)
    console.log('useEffect', devices)
  }, [devices,isConnected,beforScanning,deviceFound])
  useEffect ( ()=>{
    console.log("Device Found Before Scanning ",beforScanning , deviceFound)
    if(deviceFound && beforScanning){
      console.log("Device Found Before Scanning ",beforScanning , deviceFound)
      setTimeout(()=>{startConnecting()},1000)
    }
},[beforScanning,deviceFound])
  const {visible: statusOption,open: openStatusOption,close: closeStatusOption,} = useModalAnimation();
  const onChangeStatus = (item: any) => {
    let BloodGlucose = (item === "Fasting" ? "fasting" : "random");
      bleManager.stopDeviceScan()
      setDeviceScan(false)    
      bleManager.destroy()
      bluetoothDisable();  
      let date=new Date((Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString()
      .substring(0, new Date((Date.now() - (new Date()).getTimezoneOffset() * 60000))
      .toISOString().length - 1).replace(/\.\d+/, '');
      let obj=
      {
      vitalsList:vitalsList.data,
      profileAbleID:profileInfo?.profileAbleID,
      source_name:props?.route.params.device?.name,
      source_id:props?.route.params.Props.device_id,
      reading_type:'device',
      date:date,
      userId:profileInfo?.userId,
      SPo2:SPo2,
      PR:PR,
      weight:weight,
      highblood:highblood,
      lowblood:lowblood,
      temprature:temprature,
      glucometerValue:glucometerValue ? parseFloat((glucometerValue*18).toFixed(2)):undefined,
      gender:profileInfo?.gender,
      selectedBloodGlucose:BloodGlucose
    }
      dispatch(sendVitalsValues(obj)).then((res) => {
        res.type=="/fulfilled"?navigateVitalAction(res): navigateVitalError(res.payload)
      })
  };
    const navigateError = useCallback(async (action) => {
      setLoading(false);
      action.errors?Alert.alert(action.errors[0]):Alert.alert("WellWink service is not available, please try again later...")
  }, []);
  const ChangeNotificationsStatus:any = useCallback((param:any) => {
    dispatch(NotificationStatus(param)).then((res:any) =>{
      res.type=="NotificationStatus/fulfilled"?navigateNotificationAction(res): navigateNotificationError(res.payload)
    })
  },[]);
  const navigateNotificationError = useCallback(async (action) => {
    action.errors?Alert.alert(action.errors[0]):Alert.alert("Connection failed, please check your internet connection")
  }, []);
  const navigateNotificationAction = useCallback(async (res) => {
    console.log("Notifications Response",res.payload.data)
    }, []);
  const _base64ToArrayBuffer = (base_64: any) => {
  
    var binary_string =base64.decode(base_64);
    console.log("Binary String ",binary_string);
    var len = binary_string.length;
    console.log("Binary String Length",binary_string.length);
    var bytes = new Uint8Array(len);
    console.log("Bytes",bytes);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    console.log("Bytes",bytes);
    return bytes;
  }
  return (

   <Container style={styles.container}>
  {
setLoader &&  <AppLoader isLoading={true} /> 
}
{!beforScanning&&!afterScanning&&
    <VitalsInformation title='How to connect with your device?' description={selectedDevice?.description} image={selectedDevice?.deviceImage} 
      onPress={ () => {
        if(Platform.OS==="android"){
          DuringScan()
        } else {
          startDeviceScan()}
        }
      }
       buttonTitle={"Find Your Device"} />
  }
  {
  beforScanning&&!afterScanning&&
  <Container style={{...styles.container1,...Theme.center,  }} >
    <Text size={17} lineHeight={24} bold  marginTop={scale(30)}  >{beforScanning&&deviceFound?"Device Found":"Scanning and Connecting"}</Text>
      <Text size={13} lineHeight={16} marginTop={scale(20)}>{beforScanning&&deviceFound ? selectedDevice?.connectionScanning:selectedDevice?.connectionScanning}</Text>
     <WaveIndicator style={{paddingBottom:30}} color={Colors.TealBlue} size={350} />
     {beforScanning&&deviceFound&&
     <TouchableOpacity style={{ position:"absolute", bottom:220}} 
     //onPress={startConnecting}
     > 
      <Image
        source={selectedDevice?.deviceImage}
        style={styles.successImage}
      />
      </TouchableOpacity>
      } 
      </Container>
      }   
      { beforScanning&&afterScanning&&isConnected&&
        <> 
        <Text size={24} lineHeight={28} bold marginBottom={scale(8)} marginTop={scale(24)}>BlueTooth device values</Text>
          <VitalsDeviceDataDispaly deviceName={devices?.name}  SPo2={SPo2} PR={PR} temprature={temprature} highblood={highblood} lowblood={lowblood} glucometerValue={glucometerValue} weight={weight}/>
          { BGMSelect && <View style={{marginBottom:10}}>
            <RadioButtonRN
              data={data}
              initial={1}
              selectedBtn={(e) => { setBloodGlucoseCondition(e.label === "Fasting" ? "fasting" : "random");
              }}
              />
          </View>
          }
          {!isLoading && selectedValue && <ButtonLinear
            white
            title={'Submit'}
            onPress={submitValue}
            style={styles.buttonLinear}
            />}
          </>  
      }
    </Container>
  );
});

export default VitalsConnection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  container1: {
    flex: 1,
    //paddingHorizontal: 0,
  },
  flatList: {
    borderRadius: 12,
    paddingBottom: 180 + getBottomSpace(),
  },
  
  content: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  buttonLinear: {
   marginBottom:20
  },
  successImage: {
    width: scale(90, true),
    height: scale(90, true), 
    ...Theme.alignSelfCenter,
  },
});
   
