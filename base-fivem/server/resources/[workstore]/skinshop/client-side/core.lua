-----------------------------------------------------------------------------------------------------------------------------------------
-- VRP
-----------------------------------------------------------------------------------------------------------------------------------------
local Tunnel = module("vrp","lib/Tunnel")
local Proxy = module("vrp","lib/Proxy")
vRP = Proxy.getInterface("vRP")
-----------------------------------------------------------------------------------------------------------------------------------------
-- CONNECTION
-----------------------------------------------------------------------------------------------------------------------------------------
WorkStore = {}
Tunnel.bindInterface("skinshop",WorkStore)
vSERVER = Tunnel.getInterface("skinshop")
-----------------------------------------------------------------------------------------------------------------------------------------
-- VARIABLES
-----------------------------------------------------------------------------------------------------------------------------------------
local Init = "hat"
local Camera = nil
local Animation = false
-----------------------------------------------------------------------------------------------------------------------------------------
-- LOCALPLAYER
-----------------------------------------------------------------------------------------------------------------------------------------
LocalPlayer["state"]["Skinshop"] = {}
-----------------------------------------------------------------------------------------------------------------------------------------
-- DATASET
-----------------------------------------------------------------------------------------------------------------------------------------
local Dataset = {
	["pants"] = { item = 0, texture = 0 },
	["arms"] = { item = 0, texture = 0 },
	["tshirt"] = { item = 1, texture = 0 },
	["torso"] = { item = 0, texture = 0 },
	["vest"] = { item = 0, texture = 0 },
	["shoes"] = { item = 0, texture = 0 },
	["mask"] = { item = 0, texture = 0 },
	["backpack"] = { item = 0, texture = 0 },
	["hat"] = { item = -1, texture = 0 },
	["glass"] = { item = 0, texture = 0 },
	["ear"] = { item = -1, texture = 0 },
	["watch"] = { item = -1, texture = 0 },
	["bracelet"] = { item = -1, texture = 0 },
	["accessory"] = { item = 0, texture = 0 },
	["decals"] = { item = 0, texture = 0 }
}
-----------------------------------------------------------------------------------------------------------------------------------------
-- SKINSHOP:APPLY
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:Apply")
AddEventHandler("skinshop:Apply",function(Table)
	for Index,v in pairs(Dataset) do
		if not Table[Index] then
			Table[Index] = v
		end
	end

	Dataset = Table
	vSERVER.Update(Dataset)
	exports["skinshop"]:Apply()
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- UPDATEROUPAS
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("updateRoupas")
AddEventHandler("updateRoupas",function(custom)
	Dataset = custom
	exports["skinshop"]:Apply()
	vSERVER.Update(custom)
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- GETCUSTOMIZATION
-----------------------------------------------------------------------------------------------------------------------------------------
function WorkStore.getCustomization()
	return Dataset
end
-----------------------------------------------------------------------------------------------------------------------------------------
-- SKINSHOPS
-----------------------------------------------------------------------------------------------------------------------------------------
local Skinshops = {
	-- Skinshops
	{ 72.78,-1399.34,29.37 },
	{ -710.22,-153.07,37.41 },
	{ -163.14,-302.99,39.73 },
	{ -829.16,-1074.3,11.32 },
	{ -1188.06,-768.69,17.32 },
	{ -1450.43,-237.04,49.81 },
	{ 11.28,6514.82,31.88 },
	{ 428.6,-799.93,29.49 },
	{ -1107.66,2707.98,19.11 },
	{ -3175.35,1042.19,20.86 },
	{ 1190.27,2712.99,38.22 },
	{ 617.75,2766.35,42.09 },
	{ 121.01,-225.53,54.56 },
	{ 1695.53,4829.45,42.06 },
	-- Paramedic-1
	{ 1150.58,-1589.28,35.28 },
	{ 1150.36,-1583.34,35.28 },
	-- Paramedic-2
	{ 1824.44,3672.56,34.27 },
	-- Paramedic-3
	{ -256.85,6327.76,32.42 },
	-- Police-1
	{ -951.89,-2046.51,12.92 },
	{ -954.51,-2050.76,12.92 },
	-- Police-2
	{ 853.51,-1312.91,28.24 },
	-- Police-3
	{ 1771.42,2573.39,45.73 },
	-- Police-4
	{ 1853.45,3688.83,29.81 },
	-- Police-5
	{ -437.67,6009.04,36.99 },
	{ -439.37,6011.13,36.99 },
	-- Harmony
	{ 1187.54,2636.33,38.4 },
	-- Ottos
	{ 841.05,-824.74,26.34 },
	-- Tuners
	{ 153.22,-3013.93,7.04 },
	-- Pearls
	{ -1838.29,-1186.62,14.31 }
}
-----------------------------------------------------------------------------------------------------------------------------------------
-- THREADSTART
-----------------------------------------------------------------------------------------------------------------------------------------
CreateThread(function()
	local Tables = {}

	for Number = 1,#Skinshops do
		Tables[#Tables + 1] = { Skinshops[Number][1],Skinshops[Number][2],Skinshops[Number][3],2.0,"E","Loja de Roupas","Pressione para abrir" }
	end

	TriggerEvent("hoverfy:Insert",Tables)
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- THREADSYSTEM
-----------------------------------------------------------------------------------------------------------------------------------------
CreateThread(function()
	while true do
		local TimeDistance = 999
		local Ped = PlayerPedId()
		if not IsPedInAnyVehicle(Ped) then
			local Coords = GetEntityCoords(Ped)

			for Number = 1,#Skinshops do
				local Distance = #(Coords - vec3(Skinshops[Number][1],Skinshops[Number][2],Skinshops[Number][3]))
				if Distance <= 2 then
					TimeDistance = 1

					if IsControlJustPressed(0,38) then
						OpenSkinshop()
					end
				end
			end
		end

		Wait(TimeDistance)
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SKINSHOP:OPEN
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:Open")
AddEventHandler("skinshop:Open",function()
	TriggerEvent("dynamic:closeSystem")

	OpenSkinshop()
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- MAXVALUES
-----------------------------------------------------------------------------------------------------------------------------------------
function MaxValues()
	local MaxValues = {
		["pants"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 4 },
		["arms"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 3 },
		["tshirt"] = { min = 1, item = 0, texture = 0, mode = "variation", id = 8 },
		["torso"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 11 },
		["vest"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 9 },
		["shoes"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 6 },
		["mask"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 1 },
		["backpack"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 5 },
		["hat"] = { min = -1, item = 0, texture = 0, mode = "prop", id = 0 },
		["glass"] = { min = 0, item = 0, texture = 0, mode = "prop", id = 1 },
		["ear"] = { min = -1, item = 0, texture = 0, mode = "prop", id = 2 },
		["watch"] = { min = -1, item = 0, texture = 0, mode = "prop", id = 6 },
		["bracelet"] = { min = -1, item = 0, texture = 0, mode = "prop", id = 7 },
		["accessory"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 7 },
		["decals"] = { min = 0, item = 0, texture = 0, mode = "variation", id = 10 }
	}

	local Ped = PlayerPedId()
	for Index,v in pairs(MaxValues) do
		if v["mode"] == "variation" then
			v["item"] = GetNumberOfPedDrawableVariations(Ped,v["id"])
			v["texture"] = GetNumberOfPedTextureVariations(Ped,v["id"],GetPedDrawableVariation(Ped,v["id"])) - 1
		elseif v["mode"] == "prop" then
			v["item"] = GetNumberOfPedPropDrawableVariations(Ped,v["id"])
			v["texture"] = GetNumberOfPedPropTextureVariations(Ped,v["id"],GetPedPropIndex(Ped,v["id"])) - 1
		end

		if v["texture"] < 0 then
			v["texture"] = 0
		end
	end

	return MaxValues
end
-----------------------------------------------------------------------------------------------------------------------------------------
-- OPENSKINSHOP
-----------------------------------------------------------------------------------------------------------------------------------------
function OpenSkinshop()
	LocalPlayer["state"]["Skinshop"] = Dataset
	Bucket = LocalPlayer["state"]["Route"]
	SendNUIMessage({ action = "open", data = { Current = Dataset, Max = MaxValues() } })
	vRP.PlayAnim(true,{"mp_sleep","bind_pose_180"},true)

	SetNuiFocus(true,true)
	CameraActive()
end
-----------------------------------------------------------------------------------------------------------------------------------------
-- CAMERAACTIVE
-----------------------------------------------------------------------------------------------------------------------------------------
function CameraActive(Number)
	if DoesCamExist(Camera) then
		RenderScriptCams(false,false,0,false,false)
		SetCamActive(Camera,false)
		DestroyCam(Camera,false)
		Camera = nil
	end

	local Ped = PlayerPedId()

	if Number then
		SetEntityCoords(Ped,Skinshops[Number][1],Skinshops[Number][2],Skinshops[Number][3] - 1)
		SetEntityHeading(Ped,Skinshops[Number][4])
	end

	local Heading = GetEntityHeading(Ped)
	Camera = CreateCam("DEFAULT_SCRIPTED_CAMERA",true)
	local Coords = GetOffsetFromEntityInWorldCoords(Ped,0.25,1.0,0.0)

	if Init == "hat" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.45)
	elseif Init == "shirt" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.25)
	elseif Init == "pants" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] - 0.45)
	elseif Init == "clock" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.05)
	end

	RenderScriptCams(true,true,100,true,true)
	SetCamRot(Camera,0.0,0.0,Heading + 180)
	SetEntityHeading(Ped,Heading)
	SetCamActive(Camera,true)
end
-----------------------------------------------------------------------------------------------------------------------------------------
-- APPLY
-----------------------------------------------------------------------------------------------------------------------------------------
exports("Apply",function(Data,Ped)
	if not Ped then
		Ped = PlayerPedId()
	end

	if not Data then
		Data = Dataset
	end

	for Index,v in pairs(Dataset) do
		if not Data[Index] then
			Data[Index] = {
				["item"] = v["item"],
				["texture"] = v["texture"]
			}
		end
	end

	SetPedComponentVariation(Ped,4,Data["pants"]["item"],Data["pants"]["texture"],1)
	SetPedComponentVariation(Ped,3,Data["arms"]["item"],Data["arms"]["texture"],1)
	SetPedComponentVariation(Ped,5,Data["backpack"]["item"],Data["backpack"]["texture"],1)
	SetPedComponentVariation(Ped,8,Data["tshirt"]["item"],Data["tshirt"]["texture"],1)
	SetPedComponentVariation(Ped,9,Data["vest"]["item"],Data["vest"]["texture"],1)
	SetPedComponentVariation(Ped,11,Data["torso"]["item"],Data["torso"]["texture"],1)
	SetPedComponentVariation(Ped,6,Data["shoes"]["item"],Data["shoes"]["texture"],1)
	SetPedComponentVariation(Ped,1,Data["mask"]["item"],Data["mask"]["texture"],1)
	SetPedComponentVariation(Ped,10,Data["decals"]["item"],Data["decals"]["texture"],1)
	SetPedComponentVariation(Ped,7,Data["accessory"]["item"],Data["accessory"]["texture"],1)

	if Data["hat"]["item"] ~= -1 and Data["hat"]["item"] ~= 0 then
		SetPedPropIndex(Ped,0,Data["hat"]["item"],Data["hat"]["texture"],1)
	else
		ClearPedProp(Ped,0)
	end

	if Data["glass"]["item"] ~= -1 and Data["glass"]["item"] ~= 0 then
		SetPedPropIndex(Ped,1,Data["glass"]["item"],Data["glass"]["texture"],1)
	else
		ClearPedProp(Ped,1)
	end

	if Data["ear"]["item"] ~= -1 and Data["ear"]["item"] ~= 0 then
		SetPedPropIndex(Ped,2,Data["ear"]["item"],Data["ear"]["texture"],1)
	else
		ClearPedProp(Ped,2)
	end

	if Data["watch"]["item"] ~= -1 and Data["watch"]["item"] ~= 0 then
		SetPedPropIndex(Ped,6,Data["watch"]["item"],Data["watch"]["texture"],1)
	else
		ClearPedProp(Ped,6)
	end

	if Data["bracelet"]["item"] ~= -1 and Data["bracelet"]["item"] ~= 0 then
		SetPedPropIndex(Ped,7,Data["bracelet"]["item"],Data["bracelet"]["texture"],1)
	else
		ClearPedProp(Ped,7)
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- UPDATE
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNUICallback("update",function(Data,Callback)
	Dataset = Data
	exports["skinshop"]:Apply()

	Callback(MaxValues())
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETUP
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNUICallback("Setup",function(Data,Callback)
	Init = Data["value"]
	local Ped = PlayerPedId()
	local Coords = GetOffsetFromEntityInWorldCoords(Ped,0.25,1.0,0.0)

	if Init == "hat" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.45)
	elseif Init == "shirt" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.25)
	elseif Init == "pants" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] - 0.45)
	elseif Init == "clock" then
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.05)
	end

	Callback("Ok")
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SAVE
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNUICallback("Save",function(Data,Callback)
	if DoesCamExist(Camera) then
		RenderScriptCams(false,false,0,false,false)
		SetCamActive(Camera,false)
		DestroyCam(Camera,false)
		Camera = nil
	end

	SetNuiFocus(false,false)
	vSERVER.Update(Dataset)
	vRP.Destroy()
	Callback("Ok")
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- RESET
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNUICallback("Reset",function(Data,Callback)
	if DoesCamExist(Camera) then
		RenderScriptCams(false,false,0,false,false)
		SetCamActive(Camera,false)
		DestroyCam(Camera,false)
		Camera = nil
	end

	exports["skinshop"]:Apply(LocalPlayer["state"]["Skinshop"])

	Dataset = LocalPlayer["state"]["Skinshop"]
	LocalPlayer["state"]["Skinshop"] = {}
	SetNuiFocus(false,false)
	vRP.Destroy()

	Callback("Ok")
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- ROTATE
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNUICallback("Rotate",function(Data,Callback)
	local Ped = PlayerPedId()

	if Data == "Left" then
		SetEntityHeading(Ped,GetEntityHeading(Ped) - 5)
	elseif Data == "Right" then
		SetEntityHeading(Ped,GetEntityHeading(Ped) + 5)
	elseif Data == "Top" then
		local Coords = GetCamCoord(Camera)
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] + 0.05)
	elseif Data == "Bottom" then
		local Coords = GetCamCoord(Camera)
		SetCamCoord(Camera,Coords["x"],Coords["y"],Coords["z"] - 0.05)
	end

	Callback("Ok")
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETHAT
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setHat")
AddEventHandler("skinshop:setHat",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		local Ped = PlayerPedId()
		vRP.playAnim(true,{"mp_masks@standard_car@ds@","put_on_mask"},true)

		Wait(1000)

		if GetPedPropIndex(Ped,0) == Dataset["hat"]["item"] then
			ClearPedProp(Ped,0)
		else
			SetPedPropIndex(Ped,0,Dataset["hat"]["item"],Dataset["hat"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETMASK
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setMask")
AddEventHandler("skinshop:setMask",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		local Ped = PlayerPedId()
		vRP.playAnim(true,{"missfbi4","takeoff_mask"},true)

		Wait(1000)

		if GetPedDrawableVariation(Ped,1) == Dataset["mask"]["item"] then
			SetPedComponentVariation(Ped,1,0,0,1)
		else
			SetPedComponentVariation(Ped,1,Dataset["mask"]["item"],Dataset["mask"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETGLASSES
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setGlasses")
AddEventHandler("skinshop:setGlasses",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		local Ped = PlayerPedId()
		vRP.playAnim(true,{"clothingspecs","take_off"},true)

		Wait(1000)

		if GetPedPropIndex(Ped,1) == Dataset["glass"]["item"] then
			ClearPedProp(Ped,1)
		else
			SetPedPropIndex(Ped,1,Dataset["glass"]["item"],Dataset["glass"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETSHIRT
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setShirt")
AddEventHandler("skinshop:setShirt",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		vRP.playAnim(true,{"clothingtie","try_tie_negative_a"},true)
		Wait(1000)
	
		local Ped = PlayerPedId()
	
		if GetPedDrawableVariation(Ped,8) == Dataset["tshirt"]["item"] then
			SetPedComponentVariation(Ped,8,15,0,1)
			SetPedComponentVariation(Ped,3,15,0,1)
		else
			SetPedComponentVariation(Ped,8,Dataset["tshirt"]["item"],Dataset["tshirt"]["texture"],1)
		end
	
		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETTORSO
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setTorso")
AddEventHandler("skinshop:setTorso",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		vRP.playAnim(true,{"clothingtie","try_tie_negative_a"},true)
		Wait(1000)

		local Ped = PlayerPedId()

		if GetPedDrawableVariation(Ped,11) == Dataset["torso"]["item"] then
			SetPedComponentVariation(Ped,11,15,0,1)
			SetPedComponentVariation(Ped,3,15,0,1)
		else
			SetPedComponentVariation(Ped,11,Dataset["torso"]["item"],Dataset["torso"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETARMS
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setArms")
AddEventHandler("skinshop:setArms",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		vRP.playAnim(true,{"clothingtie","try_tie_negative_a"},true)
		Wait(1000)

		local Ped = PlayerPedId()

		if GetPedDrawableVariation(Ped,3) == Dataset["arms"]["item"] then
			SetPedComponentVariation(Ped,3,15,0,1)
		else
			SetPedComponentVariation(Ped,3,Dataset["arms"]["item"],Dataset["arms"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETVEST
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setVest")
AddEventHandler("skinshop:setVest",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		vRP.playAnim(true,{"clothingtie","try_tie_negative_a"},true)
		Wait(1000)

		local Ped = PlayerPedId()

		if GetPedDrawableVariation(Ped,9) == Dataset["vest"]["item"] then
			SetPedComponentVariation(Ped,9,0,0,1)
		else
			SetPedComponentVariation(Ped,9,Dataset["vest"]["item"],Dataset["vest"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETPANTS
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setPants")
AddEventHandler("skinshop:setPants",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		vRP.playAnim(true,{"clothingtie","try_tie_negative_a"},true)
		Wait(1000)

		local Ped = PlayerPedId()

		if GetPedDrawableVariation(Ped,4) == Dataset["pants"]["item"] then
			if GetEntityModel(Ped) == GetHashKey("mp_m_freemode_01") then
				SetPedComponentVariation(Ped,4,14,0,1)
			elseif GetEntityModel(Ped) == GetHashKey("mp_f_freemode_01") then
				SetPedComponentVariation(Ped,4,15,0,1)
			end
		else
			SetPedComponentVariation(Ped,4,Dataset["pants"]["item"],Dataset["pants"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- SETSHOES
-----------------------------------------------------------------------------------------------------------------------------------------
RegisterNetEvent("skinshop:setShoes")
AddEventHandler("skinshop:setShoes",function()
	if not Animation and not LocalPlayer["state"]["Buttons"] then
		Animation = true
		vRP.playAnim(true,{"clothingtie","try_tie_negative_a"},true)
		Wait(1000)

		local Ped = PlayerPedId()

		if GetPedDrawableVariation(Ped,6) == Dataset["shoes"]["item"] then
			SetPedComponentVariation(Ped,6,5,0,1)
		else
			SetPedComponentVariation(Ped,6,Dataset["shoes"]["item"],Dataset["shoes"]["texture"],1)
		end

		vRP.Destroy()
		Animation = false
	end
end)
-----------------------------------------------------------------------------------------------------------------------------------------
-- CHECKSHOES
-----------------------------------------------------------------------------------------------------------------------------------------
function WorkStore.checkShoes()
	local Number = 34
	local Ped = PlayerPedId()
	if GetEntityModel(Ped) == GetHashKey("mp_f_freemode_01") then
		Number = 35
	end

	if Dataset["shoes"]["item"] ~= Number then
		Dataset["shoes"]["item"] = Number
		Dataset["shoes"]["texture"] = 0
		SetPedComponentVariation(Ped,6,Dataset["shoes"]["item"],Dataset["shoes"]["texture"],1)

		return true
	end

	return false
end
-----------------------------------------------------------------------------------------------------------------------------------------
-- CUSTOMIZATION
-----------------------------------------------------------------------------------------------------------------------------------------
function WorkStore.Customization()
	return Dataset
end